import subprocess, pathlib, uuid, os

MODEL_DIR = pathlib.Path("../model")          # adjust if model in docker image
PYTHON    = "python"                          # or full path to conda env

def generate_3d_asset(prompt: str, images: list[str], out_dir: str) -> str:
    """
    Calls Hunyuan3D-2.0’s `demo.py` (or similar) and returns the .glb path.
    Adapt the CLI to the exact script the repo provides.
    """
    out_dir = pathlib.Path(out_dir)
    out_dir.mkdir(exist_ok=True, parents=True)
    result_name = f"{uuid.uuid4()}.glb"
    result_path = out_dir / result_name

    cmd = [
        PYTHON, "tools/demo.py",
        "--text", prompt or "",
        "--images", *images,          # Hunyuan accepts single-view or multi-view
        "--output", str(result_path)
    ]
    subprocess.run(cmd, cwd=MODEL_DIR, check=True)
    return str(result_path)
