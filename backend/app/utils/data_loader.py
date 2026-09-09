import pandas as pd
import re


def load_counts(file_path):
    """
    Load a gene-expression/count matrix from CSV, TSV, TXT, or similar files.

    Automatically:
    - Detects delimiter
    - Detects common gene-ID columns
    - Handles Ensembl, Entrez, HGNC/SYMBOL, RefSeq, etc.
    - Removes annotation/metadata columns from the count matrix
    - Keeps as many possible sample columns as possible
    """

    # ---------------------------------------------------------
    # 1. Try different delimiters
    # ---------------------------------------------------------
    separators = [",", "\t", ";", "|"]

    df = None

    for sep in separators:
        try:
            test_df = pd.read_csv(
                file_path,
                sep=sep,
                low_memory=False
            )

            if test_df.shape[1] > 1:
                df = test_df
                break

        except Exception:
            continue

    # Fallback: whitespace-separated
    if df is None:
        try:
            df = pd.read_csv(
                file_path,
                sep=r"\s+",
                engine="python",
                low_memory=False
            )
        except Exception as e:
            raise ValueError(
                f"Could not read file: {file_path}\n{e}"
            )

    # Clean column names
    df.columns = (
        df.columns
        .astype(str)
        .str.strip()
        .str.replace("\ufeff", "", regex=False)
    )

    # ---------------------------------------------------------
    # 2. Possible gene identifier columns
    # ---------------------------------------------------------

    gene_cols = [
        # Ensembl
        "gene_id",
        "GeneID",
        "geneID",
        "gene",
        "ensembl_gene_id",
        "ensembl_gene",
        "EnsemblGeneID",
        "Ensembl_Gene_ID",
        "ENSEMBL",
        "Ensembl",

        # HGNC / gene symbol
        "symbol",
        "SYMBOL",
        "gene_symbol",
        "GeneSymbol",
        "hgnc_symbol",
        "HGNC_symbol",
        "HGNC",

        # Entrez
        "entrez_id",
        "EntrezID",
        "ENTREZID",
        "entrezgene",
        "entrez_gene_id",
        "Entrez_Gene_ID",

        # Other common identifiers
        "ID",
        "id",
        "ID_REF",
        "Name",
        "name",
        "Gene",
        "GENE",
        "Gene_Name",
        "gene_name",
        "gene_identifier",

        # RefSeq
        "refseq",
        "RefSeq",
        "refseq_id",
        "RefSeq_ID",

        # Transcript IDs
        "transcript_id",
        "TranscriptID",
        "transcript",
        "feature_id",

        # Common count-table names
        "feature",
        "Feature",
        "gene",
        "Geneid",
        "Gene_ID"
    ]

    # Case-insensitive lookup
    normalized_gene_cols = {
        str(x).strip().lower(): x
        for x in df.columns
    }

    gene_col = None

    for candidate in gene_cols:
        if candidate.lower() in normalized_gene_cols:
            gene_col = normalized_gene_cols[candidate.lower()]
            break

    # ---------------------------------------------------------
    # 3. If no obvious gene column, inspect first few columns
    # ---------------------------------------------------------

    if gene_col is None:

        for col in df.columns[:10]:

            values = df[col].dropna().astype(str).head(100)

            if len(values) == 0:
                continue

            # Ensembl gene IDs
            ensembl_fraction = values.str.match(
                r"^ENS[A-Z]*G\d+(\.\d+)?$",
                case=False
            ).mean()

            # Gene symbols
            symbol_fraction = values.str.match(
                r"^[A-Za-z][A-Za-z0-9\-\.]*$"
            ).mean()

            # RefSeq
            refseq_fraction = values.str.match(
                r"^(NM|NR|XM|XR)_\d+",
                case=False
            ).mean()

            if (
                ensembl_fraction >= 0.3
                or refseq_fraction >= 0.3
                or symbol_fraction >= 0.7
            ):
                gene_col = col
                break

    # Last resort: first column
    if gene_col is None:
        gene_col = df.columns[0]

    # ---------------------------------------------------------
    # 4. Rename gene column
    # ---------------------------------------------------------

    if gene_col != "gene_id":
        df = df.rename(columns={gene_col: "gene_id"})

    # ---------------------------------------------------------
    # 5. Remove completely empty rows
    # ---------------------------------------------------------

    df = df.dropna(how="all")

    # Remove empty gene IDs
    df = df[
        df["gene_id"].notna() &
        (df["gene_id"].astype(str).str.strip() != "")
    ]

    # ---------------------------------------------------------
    # 6. Identify annotation / metadata columns
    # ---------------------------------------------------------

    annotation_columns = {
        "gene_id",
        "ensembl_gene_id",
        "entrez_id",
        "entrezgene",
        "entrez_gene_id",
        "hgnc_symbol",
        "gene_symbol",
        "symbol",
        "gene_name",
        "gene_biotype",
        "gene_type",
        "biotype",
        "chromosome",
        "chromosome_name",
        "chr",
        "start",
        "end",
        "strand",
        "length",
        "gene_length",
        "transcript_id",
        "refseq",
        "refseq_id",
        "description",
        "annotation",
        "gene_description",
        "external_gene_name",
        "external_gene_id",
        "feature",
        "source",
        "version"
    }

    # ---------------------------------------------------------
    # 7. Find numeric/sample columns
    # ---------------------------------------------------------

    sample_columns = []

    for col in df.columns:

        if col == "gene_id":
            continue

        col_lower = str(col).strip().lower()

        # Known annotation column
        if col_lower in annotation_columns:
            continue

        # Convert values to numeric where possible
        numeric_values = pd.to_numeric(
            df[col],
            errors="coerce"
        )

        numeric_fraction = numeric_values.notna().mean()

        # -----------------------------------------------------
        # Sample-name patterns
        # -----------------------------------------------------

        sample_pattern = re.search(
            r"""
            (
                ^S\d+
                |^SRR\d+
                |^ERR\d+
                |^DRR\d+
                |^GSM\d+
                |^sample
                |^control
                |^ctrl
                |^treat
                |^treatment
                |^case
                |^normal
                |^tumou?r
                |^wt
                |^ko
                |^wt_
                |^ko_
                |^X\d+
                |^MIX
                |POST-NACT
                |PRE-NACT
                |NACT
                |CRS
                |patient
                |rep
                |replicate
            )
            """,
            str(col),
            flags=re.IGNORECASE | re.VERBOSE
        )

        # -----------------------------------------------------
        # Keep numeric columns that look like samples
        # -----------------------------------------------------

        if numeric_fraction >= 0.50:

            if sample_pattern:
                sample_columns.append(col)

            # Also keep numeric columns if they aren't
            # obvious annotation columns.
            elif numeric_fraction >= 0.90:
                sample_columns.append(col)

    # ---------------------------------------------------------
    # 8. Fallback if no sample columns detected
    # ---------------------------------------------------------

    if len(sample_columns) == 0:

        for col in df.columns:

            if col == "gene_id":
                continue

            if str(col).lower() in annotation_columns:
                continue

            numeric_values = pd.to_numeric(
                df[col],
                errors="coerce"
            )

            if numeric_values.notna().mean() >= 0.90:
                sample_columns.append(col)

    # ---------------------------------------------------------
    # 9. Build count matrix
    # ---------------------------------------------------------

    if len(sample_columns) == 0:
        raise ValueError(
            "No numeric sample columns could be detected."
        )

    counts = df[["gene_id"] + sample_columns].copy()

    # Convert expression/count columns to numeric
    for col in sample_columns:
        counts[col] = pd.to_numeric(
            counts[col],
            errors="coerce"
        )

    # Replace missing numeric values with 0
    counts[sample_columns] = counts[sample_columns].fillna(0)

    # ---------------------------------------------------------
    # 10. Remove duplicated gene IDs
    # ---------------------------------------------------------

    counts = (
        counts
        .groupby("gene_id", as_index=False)[sample_columns]
        .sum()
    )

    # ---------------------------------------------------------
    # 11. Set gene ID as index
    # ---------------------------------------------------------

    counts = counts.set_index("gene_id")

    return counts