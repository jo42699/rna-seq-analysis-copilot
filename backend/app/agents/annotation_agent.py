
import pandas as pd
import gzip


# ---------------------------------------------------------
# 1. Parse GTF annotation
# ---------------------------------------------------------

def parse_gtf(gtf_path):

    rows = []

    opener = gzip.open if gtf_path.endswith(".gz") else open

    with opener(gtf_path, "rt") as f:

        for line in f:

            if line.startswith("#"):
                continue

            fields = line.rstrip("\n").split("\t")

            if len(fields) < 9:
                continue

            # Keep gene-level records only
            if fields[2] != "gene":
                continue

            chrom = fields[0]
            start = int(fields[3])
            end = int(fields[4])
            attrs = fields[8]

            attr_dict = {}

            for item in attrs.split(";"):

                item = item.strip()

                if not item:
                    continue

                if " " not in item:
                    continue

                key, val = item.split(" ", 1)

                attr_dict[key] = val.strip().strip('"')

            rows.append({
                "ensembl_gene_id": attr_dict.get("gene_id"),
                "symbol": attr_dict.get("gene_name"),
                "gene_type": (
                    attr_dict.get("gene_biotype")
                    or attr_dict.get("gene_type")
                ),
                "chromosome": chrom,
                "start": start,
                "end": end
            })

    annot = pd.DataFrame(rows)

    # Remove Ensembl version suffixes:
    # ENSG00000123456.7 -> ENSG00000123456
    if "ensembl_gene_id" in annot.columns:

        annot["ensembl_gene_id"] = (
            annot["ensembl_gene_id"]
            .astype("string")
            .str.replace(r"\.\d+$", "", regex=True)
        )

    return annot


# ---------------------------------------------------------
# 2. Normalize annotation-table column names
# ---------------------------------------------------------

def normalize_annotation_columns(annot):

    rename_map = {}

    # Ensembl ID
    ensembl_candidates = [
        "ensembl_gene_id",
        "EnsemblGeneID",
        "Ensembl_Gene_ID",
        "ENSEMBL",
        "Ensembl",
        "gene_id",
        "GeneID",
        "Gene_ID"
    ]

    # Gene symbol
    symbol_candidates = [
        "symbol",
        "hgnc_symbol",
        "HGNC_symbol",
        "HGNC",
        "gene_symbol",
        "GeneSymbol",
        "SYMBOL",
        "gene_name",
        "Gene_Name"
    ]

    # Gene type
    type_candidates = [
        "gene_type",
        "gene_biotype",
        "GeneType",
        "GeneBiotype",
        "biotype"
    ]

    for col in annot.columns:

        col_clean = str(col).strip()

        if col_clean in ensembl_candidates:
            rename_map[col] = "ensembl_gene_id"

        elif col_clean in symbol_candidates:
            rename_map[col] = "symbol"

        elif col_clean in type_candidates:
            rename_map[col] = "gene_type"

    annot = annot.rename(columns=rename_map)

    return annot


# ---------------------------------------------------------
# 3. Clean Ensembl IDs
# ---------------------------------------------------------

def clean_ensembl_ids(series):

    return (
        series
        .astype("string")
        .str.strip()
        .str.replace(r"\.\d+$", "", regex=True)
    )


# ---------------------------------------------------------
# 4. Annotation summary
# ---------------------------------------------------------

def annotation_ascii(df):

    total = len(df)

    if total == 0:

        return (
            "Gene Annotation Summary\n"
            "-----------------------\n"
            "Total DESeq2 genes: 0\n"
        )

    # Make sure symbol exists
    if "symbol" in df.columns:

        annotated = (
            df["symbol"]
            .notna()
            & df["symbol"].astype(str).ne("")
            & df["symbol"].astype(str).ne("nan")
        ).sum()

    else:

        annotated = 0

    missing = total - annotated

    # Identify missing annotation types
    if "ensembl_gene_id" in df.columns:

        missing_ids = (
            df.loc[
                ~(
                    df.get(
                        "symbol",
                        pd.Series(index=df.index, dtype="object")
                    )
                    .notna()
                ),
                "ensembl_gene_id"
            ]
            .astype(str)
        )

    else:

        missing_ids = pd.Series(dtype="string")

    ercc_count = (
        missing_ids
        .str.startswith("ERCC")
        .sum()
    )

    ensembl_missing = missing - ercc_count

    summary = (
        "Gene Annotation Summary\n"
        "-----------------------\n"
        f"Total DESeq2 genes: {total}\n"
        f"Annotated genes: {annotated}\n"
        f"Missing annotations: {missing}\n"
        f"Annotation success rate: "
        f"{annotated / total * 100:.2f}%\n\n"
        f"Missing ERCC spike-ins: {ercc_count}\n"
        f"Other missing IDs: {ensembl_missing}\n"
    )

    # Add gene type summary
    if "gene_type" in df.columns:

        summary += "\nTop Gene Types:\n"

        gene_types = (
            df["gene_type"]
            .dropna()
            .value_counts()
            .head(5)
        )

        for name, count in gene_types.items():

            summary += f"  {name}: {count}\n"

    return summary


# ---------------------------------------------------------
# 5. Main annotation agent
# ---------------------------------------------------------

def run_annotation_agent(deseq_results, annot_path):

    # -----------------------------------------------------
    # Load annotation
    # -----------------------------------------------------

    if (
        annot_path.endswith(".gtf")
        or annot_path.endswith(".gtf.gz")
    ):

        annot = parse_gtf(annot_path)

    else:

        # Try TSV first
        try:

            annot = pd.read_csv(
                annot_path,
                sep="\t",
                low_memory=False
            )

        except Exception:

            # Fall back to CSV
            annot = pd.read_csv(
                annot_path,
                low_memory=False
            )

    # -----------------------------------------------------
    # Normalize annotation column names
    # -----------------------------------------------------

    annot = normalize_annotation_columns(annot)

    # -----------------------------------------------------
    # Validate Ensembl column
    # -----------------------------------------------------

    if "ensembl_gene_id" not in annot.columns:

        raise ValueError(
            "Annotation file does not contain an Ensembl "
            "gene ID column."
        )

    # -----------------------------------------------------
    # Ensure symbol column exists
    # -----------------------------------------------------

    if "symbol" not in annot.columns:

        annot["symbol"] = pd.NA

    # -----------------------------------------------------
    # Ensure gene type column exists
    # -----------------------------------------------------

    if "gene_type" not in annot.columns:

        annot["gene_type"] = pd.NA

    # -----------------------------------------------------
    # Clean DESeq2 Ensembl IDs
    # -----------------------------------------------------

    deseq_results = deseq_results.copy()

    deseq_results.index = clean_ensembl_ids(
        deseq_results.index
    )

    deseq_results.index.name = "ensembl_gene_id"

    # -----------------------------------------------------
    # Clean annotation Ensembl IDs
    # -----------------------------------------------------

    annot["ensembl_gene_id"] = clean_ensembl_ids(
        annot["ensembl_gene_id"]
    )

    # Remove missing IDs
    annot = annot[
        annot["ensembl_gene_id"].notna()
        & annot["ensembl_gene_id"].ne("")
    ].copy()

    # -----------------------------------------------------
    # Remove duplicate annotation IDs
    # -----------------------------------------------------

    annot = (
        annot
        .drop_duplicates(
            subset="ensembl_gene_id",
            keep="first"
        )
    )

    # -----------------------------------------------------
    # Merge annotation
    # -----------------------------------------------------

    annotated = deseq_results.merge(
        annot,
        left_index=True,
        right_on="ensembl_gene_id",
        how="left"
    )

    # -----------------------------------------------------
    # Reset index
    # -----------------------------------------------------

    annotated = annotated.reset_index(drop=True)

    # -----------------------------------------------------
    # Annotation status
    # -----------------------------------------------------

    annotated["annotation_status"] = (
        annotated["symbol"]
        .notna()
        .map({
            True: "annotated",
            False: "missing"
        })
    )

    # -----------------------------------------------------
    # Summary
    # -----------------------------------------------------

    ascii_summary = annotation_ascii(
        annotated
    )

    # -----------------------------------------------------
    # Return
    # -----------------------------------------------------

    return {
        "annotated_table": annotated,
        "ascii": ascii_summary
    }

