
# app/routes/upload.py

import os
import shutil
import uuid

from fastapi import (
    APIRouter,
    UploadFile,
    File,
    HTTPException,
    BackgroundTasks,
)

import app.state as state
from app.pipeline import run_pipeline


router = APIRouter()


# ---------------------------------------------------------
# Supported RNA-seq count-file extensions
# ---------------------------------------------------------

SUPPORTED_EXTENSIONS = {
    ".csv",
    ".tab",
    ".tsv",
    ".txt",
    ".csv.gz",
    ".tab.gz",
    ".tsv.gz",
    ".txt.gz",
}


def _safe_filename(filename: str) -> str:
    """
    Prevent directory traversal and unsafe paths.
    """
    return os.path.basename(filename)


def _is_supported_file(filename: str) -> bool:
    """
    Check whether the uploaded file has a supported
    RNA-seq count-table extension.

    Supports both normal and gzip-compressed text files.
    """

    filename_lower = filename.lower()

    return any(
        filename_lower.endswith(ext)
        for ext in SUPPORTED_EXTENSIONS
    )


def _job_counts_path(
    job_id: str,
    original_filename: str,
) -> str:
    """
    Store uploaded files under:

        app/data/jobs/<job_id>/<original_filename>
    """

    base = (
        _safe_filename(original_filename)
        or "counts.txt"
    )

    jobs_dir = os.path.join(
        "app",
        "data",
        "jobs",
        job_id,
    )

    os.makedirs(
        jobs_dir,
        exist_ok=True,
    )

    return os.path.join(
        jobs_dir,
        base,
    )


def run_pipeline_background(
    job_id: str,
    counts_path: str,
):
    """
    Background wrapper so the pipeline runs asynchronously.

    This makes it trivial to migrate to Celery/RQ later.
    """

    run_pipeline(
        counts_path=counts_path,
        job_id=job_id,
        verbose=True,
    )


@router.post("/upload")
async def upload_counts_file(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None,
):
    """
    Upload an RNA-seq count table and start the
    analysis pipeline asynchronously.

    Supported formats include:

        .csv
        .tab
        .tsv
        .txt

    and gzip-compressed versions:

        .csv.gz
        .tab.gz
        .tsv.gz
        .txt.gz

    Returns immediately with a job_id and workflow URL.
    """

    # -----------------------------------------------------
    # Validate filename
    # -----------------------------------------------------

    if not file.filename:
        raise HTTPException(
            400,
            "Filename is empty.",
        )

    filename_lower = file.filename.lower()

    if not _is_supported_file(filename_lower):

        supported = (
            ".csv, .tab, .tsv, .txt, "
            ".csv.gz, .tab.gz, .tsv.gz, .txt.gz"
        )

        raise HTTPException(
            400,
            (
                "Unsupported file type. "
                f"Supported formats: {supported}"
            ),
        )

    # -----------------------------------------------------
    # Create job_id
    # -----------------------------------------------------

    job_id = str(uuid.uuid4())

    # -----------------------------------------------------
    # Initialize job + workflow
    # -----------------------------------------------------

    safe_name = _safe_filename(
        file.filename
    )

    state.create_job(
        job_id,
        safe_name,
    )

    state.init_workflow(
        job_id
    )

    # -----------------------------------------------------
    # Save file safely
    # -----------------------------------------------------

    try:

        saved_path = _job_counts_path(
            job_id,
            file.filename,
        )

        with open(
            saved_path,
            "wb",
        ) as buffer:

            shutil.copyfileobj(
                file.file,
                buffer,
            )

    except Exception as exc:

        print(
            f"File save failed for job "
            f"{job_id}: {exc}"
        )

        raise HTTPException(
            500,
            "Failed to save uploaded file.",
        )

    # -----------------------------------------------------
    # Start pipeline in background
    # -----------------------------------------------------

    if background_tasks is None:

        raise HTTPException(
            500,
            "BackgroundTasks not available.",
        )

    background_tasks.add_task(
        run_pipeline_background,
        job_id,
        saved_path,
    )

    # -----------------------------------------------------
    # Return immediately
    # -----------------------------------------------------

    return {
        "message": (
            "Upload successful. "
            "Pipeline started."
        ),
        "job_id": job_id,
        "workflow": (
            f"/report/workflow/{job_id}"
        ),
    }

