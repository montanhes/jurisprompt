import os
import re
import asyncio
import tempfile
import traceback
from typing import Optional
from fastapi import FastAPI, UploadFile, HTTPException, Form
import pypdf
from docling.document_converter import DocumentConverter, PdfFormatOption
from docling.datamodel.pipeline_options import PdfPipelineOptions
from docling.datamodel.base_models import InputFormat

pipeline_options = PdfPipelineOptions()
pipeline_options.do_ocr = False
pipeline_options.do_table_structure = False

def cleanup_markdown(text: str) -> str:
    # Remover placeholders de imagem do docling (logos, cabecalhos)
    text = re.sub(r'\n*<!--[^>]*-->\n*', '\n\n', text)

    # Rejuntar hifenizacao de quebra de linha do PDF (com ou sem espaco ao redor)
    text = re.sub(r'(\w)-\s*\n\s*(\w)', r'\1\2', text)

    # Juntar quebra de pagina no meio de frase:
    # linha anterior nao termina com pontuacao de fim de sentenca,
    # proxima linha comeca com minuscula, aspas, parenteses ou digito
    text = re.sub(r'([^.!?:;\n])\n\n+([a-z\'")(0-9])', r'\1 \2', text)

    # Colapsar soft-wraps: linhas consecutivas nao-estruturais viram um paragrafo
    lines = text.split('\n')
    output: list[str] = []
    for line in lines:
        stripped = line.strip()
        structural = stripped.startswith(('#', '-', '*', '>', '|', '`'))
        if output and output[-1] != '' and stripped and not structural:
            output[-1] = output[-1].rstrip() + ' ' + stripped
        else:
            output.append(stripped)

    text = '\n'.join(output)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()

app = FastAPI()
converter = DocumentConverter(
    format_options={InputFormat.PDF: PdfFormatOption(pipeline_options=pipeline_options)}
)

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
            start = max(1, page_start or 1) - 1        # 0-indexed
            end = min(total, page_end or total)         # 1-indexed inclusive
            writer = pypdf.PdfWriter()
            for i in range(start, end):
                writer.add_page(reader.pages[i])
            with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as sf:
                writer.write(sf)
                slice_path = sf.name
            convert_path = slice_path

        result = await asyncio.to_thread(converter.convert, convert_path)
        return {"markdown": cleanup_markdown(result.document.export_to_markdown())}
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
