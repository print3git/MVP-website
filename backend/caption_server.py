import os
from io import BytesIO

from fastapi import FastAPI, File, UploadFile
from PIL import Image
from transformers import BlipProcessor, BlipForConditionalGeneration

app = FastAPI()

# Load BLIP model and processor once at startup
processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-base")
model = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-base")

def generate_caption(image: Image.Image) -> str:
    inputs = processor(image, return_tensors="pt")
    output = model.generate(**inputs, max_new_tokens=20)
    return processor.decode(output[0], skip_special_tokens=True)


@app.post("/caption")
async def caption(image: UploadFile = File(...)):
    """Return a caption for the uploaded image."""
    data = await image.read()
    img = Image.open(BytesIO(data)).convert("RGB")
    caption_text = generate_caption(img)
    return {"caption": caption_text}


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
