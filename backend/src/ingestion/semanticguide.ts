import {
  type StructuredElement,
  type StructuredSection
} from "./structureguide.js";

interface SemanticChunk {
  chunkId: string;
  section: string;
  subsection: string;
  topic: string;
  source: string;
  text: string;
}

function elementToText(
  element: StructuredElement
): string {
  if (element.type === "paragraph") {
    return element.text;
  }

  if (element.type === "list") {
    return element.items
      .map(item => `- ${item}`)
      .join("\n");
  }

  if (element.type === "table") {
    return element.rows
      .map(row => row.join(" | "))
      .join("\n");
  }

  return "";
}

function getParentSection(
  subsection: string
): string {
  if (subsection.startsWith("4.1")) {
    return "4.1 Profile";
  }

  if (subsection.startsWith("4.2")) {
    return "4.2 Benefit Administration";
  }

  if (subsection.startsWith("5.")) {
    return "5. Troubleshooting";
  }

  return subsection;
}

function createSemanticChunks(
  sections: StructuredSection[]
): SemanticChunk[] {
  const chunks: SemanticChunk[] = [];

  let chunkCounter = 1;

  for (const section of sections) {
    let currentTopic = section.heading;
    let currentContent: string[] = [];

    const saveChunk = () => {
      if (currentContent.length === 0) {
        return;
      }

      chunks.push({
        chunkId: `chunk-${chunkCounter}`,
        section: getParentSection(section.heading),
        subsection: section.heading,
        topic: currentTopic,
        source: "Employee Access Portal User Guide",
        text: [
          section.heading,
          currentTopic !== section.heading
            ? currentTopic
            : "",
          ...currentContent
        ]
          .filter(Boolean)
          .join("\n\n")
      });

      chunkCounter++;
      currentContent = [];
    };

    const isDisplayedDetailsHeading = (
      text: string
    ): boolean => {
      return /^Displayed (Fields|Columns)(?:\s*\([^)]*\))?:?$/i.test(
        text.trim()
      );
    };

    // These headings support a parent topic instead of becoming separate chunks.
    const supportingTopics = [
      "Navigation Buttons",
      "Enrollment Summary",
      "Confirmation",
      "Future-Dated Elections Notice"
    ];

    for (
      let i = 0;
      i < section.elements.length;
      i++
    ) {
      const element = section.elements[i];

      const nextElement =
        section.elements[i + 1];

      const secondNextElement =
        section.elements[i + 2];

      /*
        Some Word lists represent semantic parent topics,
        especially in Payroll Items.
      */
      const displayedHeadingAfterParent =
        nextElement?.type === "paragraph" &&
        nextElement.isTopic &&
        isDisplayedDetailsHeading(
          nextElement.text
        );

      const displayedHeadingAfterDescription =
        nextElement?.type === "paragraph" &&
        !nextElement.isTopic &&
        secondNextElement?.type === "paragraph" &&
        secondNextElement.isTopic &&
        isDisplayedDetailsHeading(
          secondNextElement.text
        );

      if (
        element.type === "list" &&
        element.items.length === 1 &&
        (
          displayedHeadingAfterParent ||
          displayedHeadingAfterDescription
        )
      ) {
        saveChunk();

        currentTopic = element.items[0];

        continue;
      }

      /*
        Direct Deposits has a large Displayed Fields topic
        that is meaningful as an independent chunk.
      */
      if (
        section.heading.includes(
          "Direct Deposits"
        ) &&
        element.type === "paragraph" &&
        element.isTopic &&
        isDisplayedDetailsHeading(
          element.text
        )
      ) {
        saveChunk();

        currentTopic =
          element.text.trim();

        continue;
      }

      /*
        Keep Direct Deposit utility actions together instead
        of attaching them to the preceding Effective Date topic.
      */
      if (
        section.heading.includes(
          "Direct Deposits"
        ) &&
        element.type === "paragraph" &&
        !element.isTopic
      ) {
        const additionalFunctionalityMatch =
          element.text.match(
            /^(Refresh|Section Expand\/Collapse)::\s*(.*)$/i
          );

        if (additionalFunctionalityMatch) {
          if (
            currentTopic !==
            "Additional Functionality"
          ) {
            saveChunk();

            currentTopic =
              "Additional Functionality";
          }

          const heading =
            additionalFunctionalityMatch[1];

          const description =
            additionalFunctionalityMatch[2];

          currentContent.push(
            `${heading}: ${description}`
          );

          continue;
        }
      }

      /*
        Workflow-step descriptions create natural semantic
        boundaries, such as the Open Enrollment steps.
      */
      if (
        element.type === "paragraph" &&
        !element.isTopic
      ) {
        const workflowStepMatch =
          element.text.match(
            /^The (.+?) step\b/i
          );

        if (workflowStepMatch) {
          saveChunk();

          currentTopic =
            workflowStepMatch[1].trim();

          currentContent.push(
            element.text
          );

          continue;
        }
      }

      // Split New Elections selection from its summary/navigation content.
      if (
        section.heading.includes(
          "Open Enrollment"
        ) &&
        currentTopic === "New Elections" &&
        element.type === "paragraph" &&
        element.isTopic &&
        element.text.trim() ===
          "Enrollment Summary"
      ) {
        saveChunk();

        currentTopic =
          "New Elections - Summary & Navigation";

        currentContent.push(
          element.text
        );

        continue;
      }

      // Split Review & Submit review content from confirmation/submission.
      if (
        section.heading.includes(
          "Open Enrollment"
        ) &&
        currentTopic ===
          "Review & Submit" &&
        element.type === "paragraph" &&
        element.isTopic &&
        element.text.trim() ===
          "Future-Dated Elections Notice"
      ) {
        saveChunk();

        currentTopic =
          "Review & Submit - Confirmation & Submission";

        currentContent.push(
          element.text
        );

        continue;
      }

      if (
        element.type === "paragraph" &&
        element.isTopic
      ) {
        if (
          supportingTopics.includes(
            element.text.trim()
          ) ||
          isDisplayedDetailsHeading(
            element.text
          )
        ) {
          currentContent.push(
            element.text
          );

          continue;
        }

        saveChunk();

        currentTopic =
          element.text;

        continue;
      }

      const text =
        elementToText(element);

      if (text) {
        currentContent.push(text);
      }
    }

    saveChunk();
  }

  return chunks;
}

export {
  createSemanticChunks
};

export type {
  SemanticChunk
};