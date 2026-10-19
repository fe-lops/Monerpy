"""Gera os arquivos da marca Monerpy a partir dos SVGs originais em design/brand/.

Os SVGs exportados do Canva contêm imagens PNG embutidas com máscaras (~1 MB cada), pesados demais
para o app. Este script:
  1. renderiza cada SVG em PNG com o Microsoft Edge em modo headless (fundo transparente);
  2. recorta o espaço transparente em volta;
  3. gera as versões otimizadas usadas pelo app (logo, ícones de aba, iPhone e Android).

Requisitos: Python 3 com Pillow (pip install pillow) e Microsoft Edge instalado.
Uso (na pasta Monerpy):  python scripts/brand/gerar_marca.py
"""
import os
import shutil
import subprocess
import sys
import tempfile

from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SOURCES = {  # versão -> SVG original
    "on_light": os.path.join(ROOT, "design", "brand", "logo-modo-claro.svg"),  # sombra escura, para fundo claro
    "on_dark": os.path.join(ROOT, "design", "brand", "logo-modo-escuro.svg"),  # sombra clara, para fundo escuro
}
APP_BG = (15, 23, 42, 255)  # --bg-app do tema escuro
EDGE_PATHS = [
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    "microsoft-edge",
    "msedge",
]


def find_edge() -> str:
    for p in EDGE_PATHS:
        if os.path.isfile(p) or shutil.which(p):
            return p
    sys.exit("Microsoft Edge não encontrado (necessário para renderizar os SVGs).")


def render(svg: str, png: str, edge: str) -> None:
    """SVG -> PNG transparente no tamanho original da arte (1452 x 1083)."""
    url = "file:///" + svg.replace("\\", "/")
    subprocess.run(
        [edge, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--default-background-color=00000000",
         "--window-size=1452,1083", f"--screenshot={png}", url],
        check=True, capture_output=True,
    )


def trim(img: Image.Image) -> Image.Image:
    alpha = img.getchannel("A").point(lambda a: 255 if a > 8 else 0)
    return img.crop(alpha.getbbox())


def fit(img: Image.Image, width: int) -> Image.Image:
    return img.resize((width, round(img.height * width / img.width)), Image.LANCZOS)


def square(img: Image.Image, size: int, scale: float, bg=(0, 0, 0, 0)) -> Image.Image:
    """Logo centralizada num quadrado; `scale` = fração do lado ocupada pela largura da logo."""
    canvas = Image.new("RGBA", (size, size), bg)
    logo = fit(img, round(size * scale))
    canvas.alpha_composite(logo, ((size - logo.width) // 2, (size - logo.height) // 2))
    return canvas


def out(*parts: str) -> str:
    path = os.path.join(ROOT, *parts)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    return path


def main() -> None:
    edge = find_edge()
    logos = {}
    with tempfile.TemporaryDirectory() as tmp:
        for key, svg in SOURCES.items():
            png = os.path.join(tmp, f"{key}.png")
            render(svg, png, edge)
            logos[key] = trim(Image.open(png).convert("RGBA"))
    on_light, on_dark = logos["on_light"], logos["on_dark"]

    written = []
    # Logo dentro do app (componente <Logo>): 480 px de largura = nítida até ~240 px exibidos.
    for name, img in (("logo-on-dark.webp", on_dark), ("logo-on-light.webp", on_light)):
        p = out("src", "assets", "brand", name)
        fit(img, 480).save(p, "WEBP", quality=90, method=6)
        written.append(p)
    # Ícone da aba, por tema do navegador (metadata.icons em src/app/layout.tsx).
    for name, img in (("favicon-light.png", on_light), ("favicon-dark.png", on_dark)):
        p = out("public", "brand", name)
        square(img, 96, 0.98).save(p, optimize=True)
        written.append(p)
    # favicon.ico: fallback para navegadores sem suporte a `media` nos ícones.
    p = out("src", "app", "favicon.ico")
    square(on_light, 256, 0.98).save(p, sizes=[(16, 16), (32, 32), (48, 48)])
    written.append(p)
    # iPhone (sem transparência) e Android/manifesto (0.66 = dentro da área segura "maskable").
    p = out("src", "app", "apple-icon.png")
    square(on_dark, 180, 0.78, APP_BG).convert("RGB").save(p, optimize=True)
    written.append(p)
    for size in (192, 512):
        p = out("public", "brand", f"icon-{size}.png")
        square(on_dark, size, 0.66, APP_BG).convert("RGB").save(p, optimize=True)
        written.append(p)

    for p in written:
        print(f"{os.path.getsize(p) // 1024:>4} KB  {os.path.relpath(p, ROOT)}")


if __name__ == "__main__":
    main()
