import * as cheerio from "cheerio";
import {
  extractGuideSections,
  type GuideSection
} from "./extractguide.js";

type StructuredElement =
  | {
      type: "paragraph";
      text: string;
      isTopic: boolean;
    }
  | {
      type: "list";
      items: string[];
    }
  | {
      type: "table";
      rows: string[][];
    };

interface StructuredSection {
  heading: string;
  level: string;
  elements: StructuredElement[];
}

function extractCleanText(
  $: cheerio.CheerioAPI,
  element: any
): string {
  const clone = $(element).clone();

  // Nested Word lists can contain the next workflow heading.
  clone.children("ul, ol").remove();

  const firstStrong =
    clone.children("strong").first();

  if (firstStrong.length > 0) {
    const nextElement = firstStrong.next();

    if (nextElement.is("br")) {
      const fieldName =
        firstStrong.text().trim();

      firstStrong.remove();
      clone.children("br").first().remove();

      const description =
        clone.text().trim();

      return description
        ? `${fieldName}: ${description}`
        : fieldName;
    }
  }

  return clone.text().trim();
}

function parseList(
  $: cheerio.CheerioAPI,
  listElement: any
): string[] {
  const items: string[] = [];

  $(listElement)
    .children("li")
    .each((_, li) => {
      const text =
        extractCleanText($, li);

      if (text) {
        items.push(text);
      }
    });

  return items;
}

function parseTable(
  $: cheerio.CheerioAPI,
  tableElement: any
): string[][] {
  const rows: string[][] = [];

  $(tableElement)
    .find("tr")
    .each((_, row) => {
      const cells: string[] = [];

      $(row)
        .children("th, td")
        .each((_, cell) => {
          cells.push(
            $(cell).text().trim()
          );
        });

      if (cells.length > 0) {
        rows.push(cells);
      }
    });

  return rows;
}

function structureSection(
  section: GuideSection
): StructuredSection {
  const $ = cheerio.load(section.html);

  const elements: StructuredElement[] = [];

  $("body")
    .children()
    .each((_, element) => {
      const tagName = element.tagName;

      if (tagName === "p") {
        const text =
          extractCleanText($, element);

        const clone =
          $(element).clone();

        const hasStrong =
          clone.find("strong").length > 0;

        const hasBreak =
          clone.find("br").length > 0;

        const strongText =
          clone
            .find("strong")
            .first()
            .text()
            .trim();

        const isTopic =
          hasStrong &&
          !hasBreak &&
          strongText === text &&
          text.length <= 100;

        if (
          text &&
          !text
            .toLowerCase()
            .startsWith("fig.")
        ) {
          elements.push({
            type: "paragraph",
            text,
            isTopic
          });
        }
      }

      if (
        tagName === "ul" ||
        tagName === "ol"
      ) {
        const items =
          parseList($, element);

        if (items.length > 0) {
          elements.push({
            type: "list",
            items
          });
        }
      }

      if (tagName === "table") {
        const rows =
          parseTable($, element);

        if (rows.length > 0) {
          elements.push({
            type: "table",
            rows
          });
        }
      }
    });

  return {
    heading: section.heading,
    level: section.level,
    elements
  };
}

async function buildStructuredGuide(): Promise<
  StructuredSection[]
> {
  const sections =
    await extractGuideSections();

  return sections.map(structureSection);
}

export {
  buildStructuredGuide
};

export type {
  StructuredSection,
  StructuredElement
};