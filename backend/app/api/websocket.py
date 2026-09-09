from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
import asyncio
import app.state as state

router = APIRouter(prefix="/report/workflow")

@router.get("/{job_id}")
def get_workflow_status(job_id: str):
    workflow = state.get_workflow(job_id)
    if workflow is None:
        raise HTTPException(404, f"No workflow found for job_id {job_id}")

    return {
        "job_id": job_id,
        "workflow": workflow["workflow"],
        "status": workflow["status"]
    }



@router.websocket("/ws/{job_id}")
async def workflow_ws(websocket: WebSocket, job_id: str):
    await websocket.accept()

    try:
        while True:
            workflow = state.get_workflow(job_id)

            if workflow is None:
                await websocket.send_json({"error": "job not found"})
                await asyncio.sleep(1)
                continue

            await websocket.send_json({
                "job_id": job_id,
                "workflow": workflow["workflow"],
                "status": workflow["status"]
            })

            await asyncio.sleep(1)

    except WebSocketDisconnect:
        print(f"WebSocket disconnected for job {job_id}")
