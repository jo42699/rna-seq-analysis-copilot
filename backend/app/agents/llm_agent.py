import os
import json
from typing import Dict, Any
from openai import OpenAI

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

if OPENAI_API_KEY is None:
    raise RuntimeError("OPENAI_API_KEY environment variable is not set.")

client = OpenAI(api_key=OPENAI_API_KEY)


def build_llm_prompt(report: Dict[str, Any]) -> str:
    report_json = json.dumps(report, indent=2)

    prompt = f"""
You are a senior bioinformatics and molecular biology expert.

You are given an RNA-seq analysis report in JSON format:

{report_json}

This JSON is the single source of truth. All numbers, statistics, and results
must be taken exactly from this JSON.

You must NOT invent:
- new values
- p-values
- fold changes
- gene counts
- pathways
- statistical results
- biological findings
- experimental results

Your task is to generate a structured interpretation with exactly these
top-level keys:

- technical_report
- clinical_summary
- lay_summary
- highlights
- limitations
- next_steps

GENERAL RULES:
- Use only information present in the input JSON.
- Do not fabricate new statistics, values, genes, or pathways.
- Output MUST be valid JSON.
- DO NOT wrap the JSON in triple backticks.
- DO NOT output a code block.
- DO NOT add explanations before or after the JSON.
- Respond with RAW JSON ONLY.

--------------------------------------------------
IMPORTANT — CLINICAL SUMMARY
--------------------------------------------------

The "clinical_summary" field MUST be a JSON object.

The clinical_summary object may contain ONLY these keys:

- significant_genes
- enriched_pathways
- interpretation

Rules for clinical_summary:

1. "significant_genes" must use the exact significant-gene count from the
   input JSON if that value exists.

2. "enriched_pathways" must use the exact enriched-pathway count from the
   input JSON if that value exists.

3. "interpretation" must only describe results supported by the input JSON.

4. Do NOT create:
   - no_enriched_pathways
   - statistical_power
   - fdr_threshold
   - annotation_coverage
   - or any other additional clinical_summary keys.

5. Do NOT convert a boolean into a count unless the corresponding count is
   explicitly available in the input JSON.

6. Do NOT say that no genes passed the FDR threshold if the input JSON says
   that significant genes exist.

7. If significant_genes is 9, the interpretation should acknowledge that
   9 significant genes were detected.

8. If a required clinical_summary value does not exist in the input JSON,
   omit that key rather than inventing a value.

9. The clinical_summary must remain concise and factual.

--------------------------------------------------
IMPORTANT — LAY SUMMARY
--------------------------------------------------

The "lay_summary" field MUST be a SINGLE plain-text string.

It MUST NOT be:
- an object
- a dictionary
- an array
- a list
- a collection of subheadings
- a collection of nested keys

Do NOT generate:

"lay_summary": {{
    "overview": "...",
    "key_findings": "...",
    "implications": "..."
}}

Instead, combine all relevant information into ONE concise plain-text
paragraph.

Correct format:

"lay_summary": "This RNA-seq analysis provides insights into gene expression across 12 samples. It identified 9 significant genes and 1 enriched biological pathway related to actomyosin structure organization."

--------------------------------------------------
IMPORTANT — LIMITATIONS
--------------------------------------------------

The "limitations" field MUST be a SINGLE plain-text string.

It MUST NOT be:
- an object
- a dictionary
- an array
- a list
- nested keys
- subheadings

Do NOT generate:

"limitations": {{
    "annotation_coverage": "...",
    "statistical_power": "..."
}}

Instead, combine all relevant limitations into ONE concise plain-text
paragraph.

Correct format:

"limitations": "The annotation success rate was 84.46%, with 3391 genes missing annotations. No genes passed the FDR threshold, suggesting subtle differences or limited statistical power."

Only mention limitations that are explicitly supported by the input JSON.

--------------------------------------------------
IMPORTANT — NEXT STEPS
--------------------------------------------------

The "next_steps" field MUST be a SINGLE plain-text string.

It MUST NOT be:
- an object
- a dictionary
- an array
- a list
- nested keys
- subheadings

Do NOT generate:

"next_steps": {{
    "further_analysis": "...",
    "annotation_improvement": "...",
    "pathway_investigation": "..."
}}

Instead, combine all relevant next steps into ONE concise plain-text
paragraph.

Correct format:

"next_steps": "Consider additional experiments or larger sample sizes to increase statistical power, improve gene annotation coverage, and investigate the biological significance of the enriched pathway."

Only mention next steps that are supported by the input JSON.

--------------------------------------------------
IMPORTANT — HIGHLIGHTS
--------------------------------------------------

The "highlights" field may remain a structured JSON object.

It may contain information such as:

- top_expressed_genes
- significant_genes
- enriched_pathways

Use only information available in the input JSON.

Do not invent genes, pathways, counts, or other values.

--------------------------------------------------
IMPORTANT — TECHNICAL REPORT
--------------------------------------------------

The "technical_report" field should contain a concise technical interpretation
based only on the input JSON.

It should not invent statistics or biological conclusions.

--------------------------------------------------
FINAL OUTPUT FORMAT
--------------------------------------------------

The final JSON MUST follow this general structure:

{{
    "technical_report": "plain text",
    "clinical_summary": {{
        "significant_genes": 0,
        "enriched_pathways": 0,
        "interpretation": "plain text"
    }},
    "lay_summary": "plain text",
    "highlights": {{
        "top_expressed_genes": [],
        "significant_genes": 0,
        "enriched_pathways": []
    }},
    "limitations": "plain text",
    "next_steps": "plain text"
}}

IMPORTANT:

"lay_summary" MUST be a string.

"limitations" MUST be a string.

"next_steps" MUST be a string.

Do not use nested objects or arrays for these three fields.

Respond with RAW JSON ONLY.
"""

    return prompt.strip()


def clean_llm_content(content: str) -> str:
    """
    Remove markdown fences, code blocks, and stray 'json' labels.
    Ensures the content is clean JSON before parsing.
    """

    if not content:
        return ""

    content = content.strip()

    # Remove markdown code fences if the model still returns them.
    if "```" in content:
        parts = content.split("```")

        if len(parts) >= 2:
            content = parts[1].strip()

    # Remove "json" language identifier.
    if content.lower().startswith("json"):
        content = content[4:].strip()

    # Remove stray backticks.
    content = content.replace("`", "").strip()

    return content


def convert_to_plain_text(value: Any) -> str:
    """
    Convert a value into a single plain-text string.

    This guarantees that lay_summary, limitations, and next_steps
    cannot remain nested objects or arrays.
    """

    if value is None:
        return ""

    # Already plain text.
    if isinstance(value, str):
        return value.strip()

    # If the LLM returned an object/dictionary,
    # combine all values into one paragraph.
    if isinstance(value, dict):

        text_parts = []

        for item in value.values():

            if isinstance(item, str):
                text = item.strip()

                if text:
                    text_parts.append(text)

            elif isinstance(item, list):

                for sub_item in item:

                    if isinstance(sub_item, str):
                        text = sub_item.strip()

                        if text:
                            text_parts.append(text)

                    elif sub_item is not None:
                        text_parts.append(str(sub_item))

            elif item is not None:
                text_parts.append(str(item))

        return " ".join(text_parts).strip()

    # If the LLM returned a list/array,
    # combine all items into one paragraph.
    if isinstance(value, list):

        text_parts = []

        for item in value:

            if isinstance(item, str):
                text = item.strip()

                if text:
                    text_parts.append(text)

            elif isinstance(item, dict):

                for sub_item in item.values():

                    if isinstance(sub_item, str):
                        text = sub_item.strip()

                        if text:
                            text_parts.append(text)

                    elif sub_item is not None:
                        text_parts.append(str(sub_item))

            elif item is not None:
                text_parts.append(str(item))

        return " ".join(text_parts).strip()

    # Handle numbers, booleans, etc.
    return str(value).strip()


def run_llm_agent(report: Dict[str, Any]) -> Dict[str, Any]:

    prompt = build_llm_prompt(report)

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature=0.2,
    )

    raw_content = response.choices[0].message.content

    print("\n[LLM RAW RESPONSE]")
    print(raw_content)

    cleaned = clean_llm_content(raw_content)

    print("\n[LLM CLEANED CONTENT]")
    print(cleaned)

    try:

        llm_output = json.loads(cleaned)

    except Exception as e:

        print(
            "\n[LLM JSON PARSE ERROR] Falling back to safe structure:",
            e,
        )

        llm_output = {
            "technical_report": cleaned,
            "clinical_summary": {},
            "lay_summary": "",
            "highlights": {},
            "limitations": "",
            "next_steps": "",
        }

    # ==========================================================
    # NORMALIZE CLINICAL SUMMARY
    # ==========================================================

    clinical_summary = llm_output.get("clinical_summary")

    if not isinstance(clinical_summary, dict):
        clinical_summary = {}

    # Keep ONLY the three supported clinical_summary fields.
    allowed_clinical_keys = {
        "significant_genes",
        "enriched_pathways",
        "interpretation",
    }

    clinical_summary = {
        key: value
        for key, value in clinical_summary.items()
        if key in allowed_clinical_keys
    }

    # ==========================================================
    # FORCE SOURCE CLINICAL VALUES
    # ==========================================================

    # If the source report contains the exact values,
    # prefer those values over whatever the LLM generated.
    #
    # This prevents the LLM from changing the actual counts.

    source_clinical = report.get("clinical_summary")

    if isinstance(source_clinical, dict):

        if "significant_genes" in source_clinical:

            clinical_summary["significant_genes"] = (
                source_clinical["significant_genes"]
            )

        if "enriched_pathways" in source_clinical:

            clinical_summary["enriched_pathways"] = (
                source_clinical["enriched_pathways"]
            )

    llm_output["clinical_summary"] = clinical_summary

    # ==========================================================
    # FORCE PLAIN-TEXT SECTIONS
    # ==========================================================

    # These three fields MUST always be strings:
    #
    # lay_summary
    # limitations
    # next_steps
    #
    # Even if the LLM incorrectly returns an object or array,
    # convert it into one plain-text paragraph.

    plain_text_keys = [
        "lay_summary",
        "limitations",
        "next_steps",
    ]

    for key in plain_text_keys:

        value = llm_output.get(key, "")

        llm_output[key] = convert_to_plain_text(value)

    # ==========================================================
    # GUARANTEE TOP-LEVEL KEYS EXIST
    # ==========================================================

    required_keys = [
        "technical_report",
        "clinical_summary",
        "lay_summary",
        "highlights",
        "limitations",
        "next_steps",
    ]

    for key in required_keys:

        if key not in llm_output:

            if key == "clinical_summary":
                llm_output[key] = {}

            elif key == "highlights":
                llm_output[key] = {}

            else:
                llm_output[key] = ""

    # ==========================================================
    # FINAL TYPE SAFETY
    # ==========================================================

    # Guarantee these fields are strings even if something
    # unexpected happened above.

    llm_output["lay_summary"] = convert_to_plain_text(
        llm_output.get("lay_summary", "")
    )

    llm_output["limitations"] = convert_to_plain_text(
        llm_output.get("limitations", "")
    )

    llm_output["next_steps"] = convert_to_plain_text(
        llm_output.get("next_steps", "")
    )

    # ==========================================================
    # FINAL OUTPUT
    # ==========================================================

    print("\n[LLM FINAL PARSED OUTPUT]")

    print(
        json.dumps(
            llm_output,
            indent=4,
            ensure_ascii=False
        )
    )

    return llm_output


def ask_llm(user_message: str, context: str) -> str:
    """
    Lightweight chat function that uses llm_output as context.
    """

    prompt = f"""
You are an expert bioinformatics and molecular biology assistant.

Use the following context from an RNA-seq report to answer the user's question.

Do NOT invent new numbers, statistics, genes, pathways, p-values,
fold changes, or experimental findings.

Context:
{context}

User message:
{user_message}

Answer clearly and accurately.
"""

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature=0.2,
    )

    return response.choices[0].message.content.strip()