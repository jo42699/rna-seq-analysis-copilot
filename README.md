# 🧬 RNA-seq Analysis Copilot

An interactive application for exploring and interpreting **RNA-seq differential-expression results**. The application works with RNA-seq count matrices and uses DESeq2 analysis results to provide visualisation, exploration, and conversational analysis.

---

## 📸 Application

### Dashboard

![RNA-seq Analysis Copilot Dashboard](images/Screenshot_(52).png)

### View workflow in YAML

![Differential Expression Results](images/Screenshot_(54).png)

### Conversational Analysis

![Chat Interface](images/Screenshot_(55).png)




---

## 📊 Data Sources

The project uses publicly available RNA-seq datasets from the **NCBI Gene Expression Omnibus (GEO)**.

### 1. Global effects of SUPT4H1 RNAi on gene expression of HEK293 cells

**GEO accession:** GSE116267

[Download dataset — GSE116267](https://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc=GSE116267&utm_source=chatgpt.com)

---

### 2. LEO1 Is Required for Efficient Entry into Quiescence, Control of H3K9

**GEO accession:** GSE247831

[Download dataset — GSE247831](https://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc=GSE247831&utm_source=chatgpt.com)

---

### 3. High-throughput RNA-seq analysis of mocetinostat- and DMSO-treated TC28a2 cells

**GEO accession:** GSE220755

[Download dataset — GSE220755](https://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc=GSE220755&utm_source=chatgpt.com)

---

## 🧬 Human Gene Annotation

The project uses the **Ensembl Human GRCh38 Release 116** annotation.

[Ensembl Human GRCh38 Release 116 — GTF files](https://ftp.ensembl.org/pub/release-116/gtf/homo_sapiens/?utm_source=chatgpt.com)

> ⚠️ **Note:** The uncompressed GTF file is several GB in size. The compressed `.gtf.gz` version is approximately **135 MB** and is recommended for download.

---

# 🚀 How to Run

The project consists of a **Python/FastAPI backend** and a **Next.js frontend**.

## 1. Backend

Navigate to the backend directory:

```bash
cd backend
```

Create a virtual environment:

```bash
python -m venv venv
```

Activate the virtual environment.

### Windows

```bash
venv\Scripts\activate
```

### macOS / Linux

```bash
source venv/bin/activate
```

Install the required dependencies:

```bash
pip install -r requirements.txt
```

Start the FastAPI server:

```bash
python -m uvicorn main:app --reload
```

The backend should now be running locally.

---

## 2. Frontend

Open a new terminal and navigate to the frontend:

```bash
cd frontend
```

Install the Node.js dependencies:

```bash
npm install
```

Start the Next.js development server:

```bash
npm run dev
```

Open the local URL provided by Next.js in your browser.

---

# 🔑 OpenAI API Key

The conversational analysis features require an OpenAI API key.

Create an environment variable containing **your own API key dont be greedy**.

For example:

```env
OPENAI_API_KEY=sk_blah_black_black_sheep
```

> ⚠️ **Do not commit your API key to GitHub.**
>
> Add `.env` / `.env.local` to your `.gitignore` file.

Example:

```gitignore
.env
.env.local
```

**Please use your own API key and never share it publicly.**

---

# 🏗️ Project Workflow

```text
RNA-seq Count Matrix
        ↓
   Data Loading
        ↓
     QC / Stats
        ↓
 Condition Detection
        ↓
      DESeq2
        ↓
Differential-Expression Results
        ↓
 ┌──────┼──────────┬───────────┐
 ↓      ↓          ↓           ↓
Plots  Annotation  Chat     Data Export
```

The application acts as an **interactive exploration and interpretation layer** on top of the differential-expression analysis.

---

## 📌 Important

The datasets used in this project are publicly available through **NCBI GEO**, and the human gene annotations are provided by **Ensembl**.

The application is intended for research, educational, and exploratory purposes and should not be considered a replacement for validated bioinformatics analysis pipelines.

---

## 🧬 Project

**RNA-seq Analysis Copilot**



