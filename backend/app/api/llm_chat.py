from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import app.state as state
from app.agents.llm_agent import ask_llm   

router = APIRouter(prefix="/llm")


class ChatRequest(BaseModel):
    job_id: str
    message: str


@router.post("/chat")
def llm_chat(req: ChatRequest):
    """
    Chat endpoint that uses the pipeline's llm_output as context.
    """

    report = state.get_report(req.job_id)
    if report is None:
        raise HTTPException(404, f"No report found for job_id {req.job_id}")

    llm_output = report.get("llm_output")
    if llm_output is None:
        raise HTTPException(404, "llm_output not found in report.")

    # Build context from your JSON
    context = (
        f"Technical Report:\n{llm_output.get('technical_report')}\n\n"
        f"Clinical Summary:\n{llm_output.get('clinical_summary')}\n\n"
        f"Lay Summary:\n{llm_output.get('lay_summary')}\n\n"
        f"Highlights:\n{llm_output.get('highlights')}\n\n"
        f"Limitations:\n{llm_output.get('limitations')}\n\n"
        f"Next Steps:\n{llm_output.get('next_steps')}\n"
    )

    #  LLM agent
    response = ask_llm(
        user_message=req.message,
        context=context
    )

    return {
        "job_id": req.job_id,
        "message": req.message,
        "context_used": True,
        "response": response
    }
