import os
import re
import tempfile
import traceback
from typing import Optional
from fastapi import FastAPI, UploadFile, HTTPException, Form
import pypdf
import pymupdf4llm

_OMITTED = re.compile(r'\n*==> .+ intentionally omitted <==\n*')

app = FastAPI()

@app.post("/convert")
async def convert(
    file: UploadFile,
    page_start: Optional[int] = Form(None),
    page_end: Optional[int] = Form(None),
):
    suffix = os.path.splitext(file.filename or "")[1] or ".pdf"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as f:
        f.write(await file.read())
        tmp_path = f.name

    slice_path = None
    convert_path = tmp_path
    try:
        if page_start is not None or page_end is not None:
            reader = pypdf.PdfReader(tmp_path)
            total = len(reader.pages)
            start = max(1, page_start or 1) - 1
            end = min(total, page_end or total)
            writer = pypdf.PdfWriter()
            for i in range(start, end):
                writer.add_page(reader.pages[i])
            with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as sf:
                writer.write(sf)
                slice_path = sf.name
            convert_path = slice_path

        markdown = pymupdf4llm.to_markdown(convert_path)
        markdown = _OMITTED.sub('\n', markdown).strip()
        return {"markdown": markdown}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        os.unlink(tmp_path)
        if slice_path:
            try:
                os.unlink(slice_path)
            except OSError:
                pass

@app.get("/health")
def health():
    return {"status": "ok"}
