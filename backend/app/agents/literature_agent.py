import os
import json
from typing import Dict, Any, List
import requests
from openai import OpenAI



# OpenAI Client Initialization

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if OPENAI_API_KEY is None:
    raise RuntimeError("OPENAI_API_KEY environment variable is not set.")

client = OpenAI(api_key=OPENAI_API_KEY)



# Utility: Clean LLM JSON Output

def clean_llm_content(content: str) -> str:
    if not content:
        return ""

    text = content.strip()

    if "```" in text:
        parts = text.split("```")
        if len(parts) > 1:
            text = parts[1].strip()

    if text.lower().startswith("json"):
        text = text[4:].strip()

    return text.replace("`", "").strip()



# Extract Genes From Report 

def extract_genes_from_report(report: Dict[str, Any]) -> List[str]:
    """
    Extract gene symbols from the RNA-seq report.

    Priority:
      1. Annotated gene symbols
      2. DESeq2 Ensembl IDs
      3. Top expressed genes
    """

    genes = set()

    
    #  Annotated gene symbols
  
    annotated = report.get("annotated_deseq2_top20", {})

    if isinstance(annotated, dict):
        symbols = annotated.get("symbol", {})

        if isinstance(symbols, dict):
            for symbol in symbols.values():
                if symbol:
                    genes.add(symbol.strip())

    
    # DESeq2 IDs (fallback)
  
    if not genes:

        deseq = report.get("deseq2_top20", {})

        if isinstance(deseq, dict):
            logfc = deseq.get("log2FC", {})

            if isinstance(logfc, dict):
                for gene in logfc.keys():

                    # Ignore ERCC spike-ins
                    if gene.startswith("ERCC"):
                        continue

                    genes.add(gene)

  
    #  Top expressed genes
  
    if not genes:

        expr = report.get("rna_seq_summary", {}).get(
            "top_expressed_genes", {}
        )

        if isinstance(expr, dict):
            for gene in expr.keys():
                genes.add(gene)

    return sorted(genes)



# Extract Topics From Report

def extract_topics_from_report(report: Dict[str, Any]) -> List[str]:
    topics = []
    if "gene_type_distribution" in report:
        topics.append("gene types")
    if "pathway_network" in report:
        topics.append("pathways")
    if "llm_output" in report:
        topics.append("mechanisms")
    return topics



# PubMed Search 

def search_pubmed(query: str, max_results: int = 5) -> List[Dict[str, Any]]:
    base_esearch = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
    base_esummary = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi"

    params_search = {
        "db": "pubmed",
        "term": query,
        "retmode": "json",
        "retmax": max_results,
    }

    try:
        r = requests.get(base_esearch, params=params_search, timeout=10)
        r.raise_for_status()
        data = r.json()
    except Exception:
        return []

    ids = data.get("esearchresult", {}).get("idlist", [])
    if not ids:
        return []

    params_summary = {
        "db": "pubmed",
        "id": ",".join(ids),
        "retmode": "json",
    }

    try:
        r2 = requests.get(base_esummary, params=params_summary, timeout=10)
        r2.raise_for_status()
        summaries = r2.json().get("result", {})
    except Exception:
        return []

    results = []
    for pid in ids:
        info = summaries.get(pid)
        if not isinstance(info, dict):
            continue

        title = info.get("title", "")
        journal = info.get("fulljournalname", "")
        pubdate = info.get("pubdate", "")
        authors = [a.get("name") for a in info.get("authors", []) if isinstance(a, dict)]

        link = f"https://pubmed.ncbi.nlm.nih.gov/{pid}/"

        results.append({
            "pubmed_id": pid,
            "title": title,
            "journal": journal,
            "pubdate": pubdate,
            "authors": authors,
            "link": link,
            "query": query,
        })

    return results



# Build LLM Prompt

def build_literature_llm_prompt(raw_results: List[Dict[str, Any]],
                                topics: List[str],
                                report: Dict[str, Any]) -> str:
    payload = {
        "report_context": {
            "summary": report.get("summary", {}),
            "llm_output": report.get("llm_output", {}),
            "topics": topics,
        },
        "raw_results": raw_results,
        "instructions": """
Rank papers by biological relevance.
Summarize each paper in 2–3 sentences.
Do NOT invent papers or citations.
Use ONLY the provided search results.

Return JSON:
{
  "ranked_results": [...],
  "summary": "...",
  "confidence": "high|medium|low"
}
"""
    }

    return json.dumps(payload, indent=2)



# Run LLM Ranking

def run_literature_llm(raw_results: List[Dict[str, Any]],
                       topics: List[str],
                       report: Dict[str, Any]) -> Dict[str, Any]:

    prompt = build_literature_llm_prompt(raw_results, topics, report)

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2,
    )

    cleaned = clean_llm_content(response.choices[0].message.content)

    try:
        llm_output = json.loads(cleaned)
    except Exception:
        llm_output = {
            "ranked_results": [],
            "summary": cleaned,
            "confidence": "low",
        }

    llm_output.setdefault("ranked_results", [])
    llm_output.setdefault("summary", "")
    llm_output.setdefault("confidence", "low")

    return llm_output



# Main Literature Agent 

def run_literature_agent(report: Dict[str, Any]) -> Dict[str, Any]:
    genes = extract_genes_from_report(report)
    topics = extract_topics_from_report(report)

    print("\n[LITERATURE AGENT] Extracted genes:", genes)

    if not genes:
        return {
            "genes": [],
            "topics": topics,
            "raw_results": [],
            "ranked_results": [],
            "summary": "No valid gene identifiers found in report.",
            "confidence": "low",
        }

    raw_results = []

    for gene in genes:
        # Strong PubMed query
        query = f"{gene}[Title/Abstract] AND review[Publication Type]"
        papers = search_pubmed(query, max_results=5)

        # Fallback for lncRNAs
        if not papers:
            query = f"{gene} lncRNA review"
            papers = search_pubmed(query, max_results=5)

        # Fallback for pseudogenes
        if not papers:
            query = f"{gene} pseudogene review"
            papers = search_pubmed(query, max_results=5)

        raw_results.append({
            "gene": gene,
            "papers": papers,
        })

    llm_ranked = run_literature_llm(raw_results, topics, report)

    return {
        "genes": genes,
        "topics": topics,
        "raw_results": raw_results,
        "ranked_results": llm_ranked.get("ranked_results", []),
        "summary": llm_ranked.get("summary", ""),
        "confidence": llm_ranked.get("confidence", "low"),
    }
