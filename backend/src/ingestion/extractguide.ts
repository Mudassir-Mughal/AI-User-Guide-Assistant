import mammoth from "mammoth";
import path from "path";
import * as cheerio from "cheerio";

interface GuideSection {
  heading: string;
  level: string;
  html: string;
}

const filePath = path.resolve(
  "../data/user-guide/Employee Access Portal User Guide LM review.docx"
);

async function extractGuideSections(): Promise<GuideSection[]> {
  const result = await mammoth.convertToHtml({
    path: filePath
  });

  const $ = cheerio.load(result.value);

  // Images are not needed for text-based RAG ingestion.
  $("img").remove();

  const sections: GuideSection[] = [];

  const headings = $("h1, h2, h3, h4");

  headings.each((_, element) => {
    const heading = $(element).text().trim();

    if (
      !heading ||
      heading === "Document Version History"
    ) {
      return;
    }

    const content: string[] = [];
    let current = $(element).next();

    while (
      current.length > 0 &&
      !current.is("h1, h2, h3, h4")
    ) {
      content.push($.html(current));
      current = current.next();
    }

    sections.push({
      heading,
      level: element.tagName,
      html: content.join("\n")
    });
  });

  return sections;
}

export { extractGuideSections };
export type { GuideSection };