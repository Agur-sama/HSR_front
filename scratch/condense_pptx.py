import shutil
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE = next(
    p
    for p in ROOT.iterdir()
    if p.suffix.lower() == ".pptx"
    and "22.04" in p.name
    and "5min readout" not in p.name
)
OUTPUT = ROOT / f"{SOURCE.stem} - 5min readout.pptx"

KEEP_POSITIONS = {1, 4, 7, 15, 20, 31, 33, 34, 38}

P_NS = "http://schemas.openxmlformats.org/presentationml/2006/main"
R_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
A_NS = "http://schemas.openxmlformats.org/drawingml/2006/main"
REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships"

ET.register_namespace("p", P_NS)
ET.register_namespace("r", R_NS)
ET.register_namespace("a", A_NS)
ET.register_namespace("rel", REL_NS)


def q(ns: str, tag: str) -> str:
    return f"{{{ns}}}{tag}"


def paragraph_text(paragraph: ET.Element) -> str:
    return "".join(t.text or "" for t in paragraph.iter(q(A_NS, "t"))).strip()


def set_paragraph_text(paragraph: ET.Element, text: str) -> None:
    text_nodes = list(paragraph.iter(q(A_NS, "t")))
    if not text_nodes:
        return
    text_nodes[0].text = text
    for node in text_nodes[1:]:
        node.text = ""


def replace_exact(root: ET.Element, old: str, new: str) -> int:
    changed = 0
    for paragraph in root.iter(q(A_NS, "p")):
        if paragraph_text(paragraph) == old:
            set_paragraph_text(paragraph, new)
            changed += 1
    return changed


def replace_contains(root: ET.Element, needle: str, new: str) -> int:
    changed = 0
    for paragraph in root.iter(q(A_NS, "p")):
        if needle in paragraph_text(paragraph):
            set_paragraph_text(paragraph, new)
            changed += 1
    return changed


def visible_slide_targets(entries: dict[str, bytes]) -> list[str]:
    pres = ET.fromstring(entries["ppt/presentation.xml"])
    rels = ET.fromstring(entries["ppt/_rels/presentation.xml.rels"])
    relmap = {rel.attrib["Id"]: rel.attrib["Target"] for rel in rels}
    targets = []
    for slide_id in pres.find(q(P_NS, "sldIdLst")):
        rid = slide_id.attrib[q(R_NS, "id")]
        targets.append(relmap[rid])
    return targets


def main() -> None:
    shutil.copy2(SOURCE, OUTPUT)
    with zipfile.ZipFile(OUTPUT, "r") as zin:
        entries = {name: zin.read(name) for name in zin.namelist()}

    pres = ET.fromstring(entries["ppt/presentation.xml"])
    slide_list = pres.find(q(P_NS, "sldIdLst"))
    original_ids = list(slide_list)
    for slide_id in original_ids:
        slide_list.remove(slide_id)
    for position, slide_id in enumerate(original_ids, 1):
        if position in KEEP_POSITIONS:
            slide_list.append(slide_id)
    entries["ppt/presentation.xml"] = ET.tostring(
        pres,
        encoding="utf-8",
        xml_declaration=True,
        short_empty_elements=True,
    )

    if "docProps/app.xml" in entries:
        app = ET.fromstring(entries["docProps/app.xml"])
        for elem in app.iter():
            if elem.tag.endswith("Slides"):
                elem.text = str(len(KEEP_POSITIONS))
        entries["docProps/app.xml"] = ET.tostring(
            app,
            encoding="utf-8",
            xml_declaration=True,
            short_empty_elements=True,
        )

    edits = {
        1: [
            (
                "Сетевое планирование и управлениеКСГ",
                "КСГ: сетевое планирование и управление",
            ),
            ("21.04.2026", "Короткая версия для 5-минутного readout"),
        ],
        4: [
            ("Система сетевого планирования и управления", "Зачем внедрять КСГ"),
            (
                "ПРИМЕНИМА: для сложных комплексов работ или для таких проектов, где имеется взаимозависимость большого числа задач, требующих привлечения различных специалистов и решения вопросов материально-технического обеспечения.",
                "КСГ нужен там, где много взаимозависимых работ, разные исполнители и узкие места по ресурсам.",
            ),
            ("ПОЗВОЛЯЕТ:", "Что дает управлению:"),
        ],
        15: [
            ("Процесс построения сетевых графиков", "Как развернуть КСГ: 4 шага"),
        ],
        20: [
            (
                "Расчет резервов времени путей",
                "Сильнейшее доказательство: критический путь и резервы",
            ),
        ],
        31: [
            ("Оптимизация занятости сотрудников", "Управленческие решения по оптимизации"),
        ],
        33: [
            (
                "Оптимизация числа сотрудников",
                "Результат 1: та же длительность, меньше бригада",
            ),
            (
                "Таким образом на 5 день  и на весь проект можно задействовать 17 сотрудников вместо 20.",
                "Итог: на пиковый 5-й день и на весь проект можно задействовать 17 сотрудников вместо 20.",
            ),
        ],
        34: [
            (
                "Оптимизация продолжительности проекта",
                "Результат 2: ускорение критического пути",
            ),
            (
                "Предположим, что надо уменьшить продолжительность проекта. При этом более интенсивно задействовать всех 17 сотрудников.",
                "Если цель - сократить срок проекта, высвобожденную численность направляем на критические работы.",
            ),
        ],
        38: [
            (
                "Сетевой график текущего ремонта ТР-2 тепловоза серии 2ТЭ116.",
                "Применение: текущий ремонт ТР-2 тепловоза 2ТЭ116",
            ),
            (
                "Продолжительность критического пути 269,68ч.",
                "Решение: использовать КСГ как рабочий контур контроля; критический путь = 269,68 ч. Следующие шаги: проверить ТНК и нормы, назначить владельцев участков, вести контроль отклонений по критическим работам.",
            ),
        ],
    }

    for slide_no, replacements in edits.items():
        part = f"ppt/slides/slide{slide_no}.xml"
        root = ET.fromstring(entries[part])
        for old, new in replacements:
            if not replace_exact(root, old, new):
                replace_contains(root, old[:40], new)
        entries[part] = ET.tostring(
            root,
            encoding="utf-8",
            xml_declaration=True,
            short_empty_elements=True,
        )

    with zipfile.ZipFile(OUTPUT, "w", compression=zipfile.ZIP_DEFLATED) as zout:
        for name, data in entries.items():
            zout.writestr(name, data)

    print(OUTPUT)
    print("visible_slides", len(visible_slide_targets(entries)))


if __name__ == "__main__":
    main()
