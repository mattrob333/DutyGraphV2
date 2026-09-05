"""Build the advisor PDF from the same generated HTML used in the local handbook.
Requires reportlab and beautifulsoup4; pass the final output path explicitly.
"""
from pathlib import Path
import sys, re
from xml.sax.saxutils import escape
from bs4 import BeautifulSoup, NavigableString
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle, Preformatted
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.pagesizes import A4

root = Path(__file__).resolve().parents[1]
out = Path(sys.argv[1]).resolve()
out.parent.mkdir(parents=True, exist_ok=True)
fontdir = Path('C:/Windows/Fonts')
for name, filename in [('Guide', 'arial.ttf'), ('GuideBold', 'arialbd.ttf'), ('GuideItalic', 'ariali.ttf')]:
    pdfmetrics.registerFont(TTFont(name, str(fontdir / filename)))
pdfmetrics.registerFontFamily('Guide', normal='Guide', bold='GuideBold', italic='GuideItalic', boldItalic='GuideBold')
styles = getSampleStyleSheet()
styles.add(ParagraphStyle('BodyGuide', fontName='Guide', fontSize=10.2, leading=15.8, spaceAfter=9, textColor=colors.HexColor('#263841')))
styles.add(ParagraphStyle('ChapterGuide', fontName='GuideBold', fontSize=25, leading=30, textColor=colors.HexColor('#153d49'), spaceAfter=22, keepWithNext=True))
styles.add(ParagraphStyle('HeadingGuide', fontName='GuideBold', fontSize=15.5, leading=20, textColor=colors.HexColor('#153d49'), spaceBefore=20, spaceAfter=9, keepWithNext=True))
styles.add(ParagraphStyle('SubGuide', parent=styles['HeadingGuide'], fontSize=12, leading=17, spaceBefore=13))
styles.add(ParagraphStyle('CellGuide', parent=styles['BodyGuide'], fontSize=8.2, leading=12, spaceAfter=0))
styles.add(ParagraphStyle('CellHeadGuide', parent=styles['CellGuide'], fontName='GuideBold', textColor=colors.HexColor('#153d49')))
styles.add(ParagraphStyle('BulletGuide', parent=styles['BodyGuide'], leftIndent=15, firstLineIndent=-12, spaceAfter=7))
styles.add(ParagraphStyle('QuoteGuide', parent=styles['BodyGuide'], leftIndent=14, borderPadding=8, backColor=colors.HexColor('#edf4f5')))
styles.add(ParagraphStyle('CoverTitle', parent=styles['ChapterGuide'], fontSize=37, leading=43, spaceAfter=25))
styles.add(ParagraphStyle('CoverSub', parent=styles['BodyGuide'], fontSize=15, leading=23))
styles.add(ParagraphStyle('TocGuide', parent=styles['BodyGuide'], fontSize=11, leading=17, spaceBefore=12))

def clean(text):
    return text.replace('\u2014', '-').replace('\u2013', '-').replace('\u2011', '-').replace('\u00a0', ' ')

def inline(node):
    if isinstance(node, NavigableString):
        return escape(clean(str(node)))
    content = ''.join(inline(c) for c in node.children)
    if node.name in ('b', 'strong'): return '<b>' + content + '</b>'
    if node.name in ('i', 'em'): return '<i>' + content + '</i>'
    if node.name == 'br': return '<br/>'
    return content

class GuideDoc(SimpleDocTemplate):
    def afterFlowable(self, flowable):
        if isinstance(flowable, Paragraph) and flowable.style.name == 'ChapterGuide' and flowable.getPlainText() != 'Contents':
            label = flowable.getPlainText()
            key = 'chapter-' + str(self.seq.nextf('chapter'))
            self.canv.bookmarkPage(key)
            self.canv.addOutlineEntry(label, key, 0, False)
            self.notify('TOCEntry', (0, label, self.page, key))

def footer(canvas, doc):
    canvas.saveState()
    width, height = A4
    canvas.setStrokeColor(colors.HexColor('#d3dfe3'))
    canvas.line(43, 39, width - 43, 39)
    canvas.setFont('Guide', 8)
    canvas.setFillColor(colors.HexColor('#617780'))
    canvas.drawString(43, 26, 'DUTY GRAPH 0.2  |  Advisor handbook  |  September 2026')
    canvas.drawRightString(width - 43, 26, str(doc.page))
    canvas.restoreState()

story = [Spacer(1, 72), Paragraph('DUTY GRAPH', styles['HeadingGuide']), Paragraph('Understand the work.<br/>Guide the next decision.', styles['CoverTitle']), Paragraph('Advisor handbook<br/>User manual, walkthrough and training materials', styles['CoverSub']), Spacer(1, 30)]
for text in ['Release 0.2 - Local advisor pilot', 'A complete human-led path from the first interview to a reviewed client packet.', 'Includes a Northstar Parts practice engagement, exercises, facilitator answers and delivery guidance. All training people and measurements are fictional.']:
    story.append(Paragraph(text, styles['BodyGuide']))
story += [Spacer(1, 34), Paragraph('This handbook describes implemented behavior. External AI, email, enterprise authority and live business execution are unconfigured. Consult the technical release record before using a customer environment.', styles['QuoteGuide']), PageBreak(), Paragraph('Contents', styles['ChapterGuide'])]
toc = TableOfContents()
toc.levelStyles = [styles['TocGuide']]
story += [toc, PageBreak()]
width = A4[0] - 86
for index, file in enumerate(sorted((root / 'client/public/handbook').glob('0[1-8]-*.html'))):
    if index: story.append(PageBreak())
    soup = BeautifulSoup(file.read_text(encoding='utf-8'), 'html.parser')
    main = soup.find('main')
    for node in main.children:
        if isinstance(node, NavigableString): continue
        name = node.name
        if name in ('nav', 'footer'): continue
        if name in ('h1', 'h2', 'h3', 'h4'):
            style = 'ChapterGuide' if name == 'h1' else 'HeadingGuide' if name == 'h2' else 'SubGuide'
            story.append(Paragraph(inline(node), styles[style]))
        elif name == 'p': story.append(Paragraph(inline(node), styles['BodyGuide']))
        elif name in ('ol', 'ul'):
            for i, item in enumerate(node.find_all('li', recursive=False), 1):
                prefix = f'{i}. ' if name == 'ol' else '\u2022 '
                story.append(Paragraph(prefix + inline(item), styles['BulletGuide']))
        elif name == 'blockquote': story.append(Paragraph(inline(node), styles['QuoteGuide']))
        elif name == 'pre':
            text = clean(node.get_text()).strip()
            # Wrap long sample CSV/code lines within the content width.
            import textwrap
            text = '\n'.join('\n'.join(textwrap.wrap(line, 85, replace_whitespace=False, drop_whitespace=False)) for line in text.splitlines())
            story.append(Preformatted(text, ParagraphStyle('CodeGuide', fontName='Courier', fontSize=8, leading=11, backColor=colors.HexColor('#f0f4f5'), borderPadding=9, spaceAfter=12)))
        elif name == 'div' and node.find('table'):
            table = node.find('table')
            rows = [[Paragraph(inline(cell), styles['CellHeadGuide' if cell.name == 'th' else 'CellGuide']) for cell in row.find_all(['td', 'th'])] for row in table.find_all('tr')]
            count = len(rows[0])
            fractions = {2: [0.27, 0.73], 3: [0.23, 0.39, 0.38], 4: [0.2, 0.26, 0.27, 0.27]}.get(count, [1/count]*count)
            t = Table(rows, colWidths=[width*f for f in fractions], repeatRows=1, hAlign='LEFT')
            t.setStyle(TableStyle([('BACKGROUND', (0,0), (-1,0), colors.HexColor('#e8f0f2')), ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f7f9fa')]), ('GRID', (0,0), (-1,-1), .4, colors.HexColor('#cbd7db')), ('VALIGN', (0,0), (-1,-1), 'TOP'), ('LEFTPADDING', (0,0), (-1,-1), 7), ('RIGHTPADDING', (0,0), (-1,-1), 7), ('TOPPADDING', (0,0), (-1,-1), 8), ('BOTTOMPADDING', (0,0), (-1,-1), 8)]))
            story.extend([Spacer(1, 6), t, Spacer(1, 12)])
doc = GuideDoc(str(out), pagesize=A4, rightMargin=43, leftMargin=43, topMargin=43, bottomMargin=55, title='Duty Graph 0.2 - Advisor handbook', author='Duty Graph', subject='User manual, guided walkthrough, playbook and training exercises')
doc.multiBuild(story, onFirstPage=footer, onLaterPages=footer)
print(str(out))
