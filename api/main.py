from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from hunyuan_runner import generate_3d_asset
import uuid, os

from storage import upload_to_storage # or upload_to_s3


app = FastAPI()

GENERATED_DIR = os.getenv("GENERATED_DIR", "generated")

@app.post("/generate")
async def generate(prompt: str = Form(""),
                   images: list[UploadFile] = File([])):
    # 1. Save incoming images to disk
    img_paths = []
    for f in images:
        fname = f"{uuid.uuid4()}_{f.filename}"
        path  = os.path.join("uploads", fname)
        img_paths.append(path)
        with open(path, "wb") as out:
            out.write(await f.read())

    # 2. Kick off Hunyuan3D inference
    try:
        glb_path = generate_3d_asset(prompt, img_paths, GENERATED_DIR)
    except Exception as e:
        raise HTTPException(500, str(e))

    # 3. Move / upload .glb somewhere public
    public_url = upload_to_s3(glb_path)     # or GCS, Cloudflare R2 …
    return JSONResponse({"glb_url": public_url})

