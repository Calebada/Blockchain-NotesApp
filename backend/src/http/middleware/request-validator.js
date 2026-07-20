const { AppError } = require("../../common/app-error");

function parseStoredNoteContent(content) {
  try {
    const parsed = JSON.parse(content);

    if (parsed && typeof parsed === "object" && typeof parsed.content === "string") {
      return {
        title: typeof parsed.title === "string" ? parsed.title.trim() : "",
        tag: typeof parsed.tag === "string" && parsed.tag.trim() ? parsed.tag.trim() : "General",
        content: parsed.content.trim(),
      };
    }
  } catch {
    return null;
  }

  return null;
}

function validateNotePayload(body = {}) {
  const { author, title, tag, content } = body;

  if (typeof content !== "string" || !content.trim()) {
    throw new AppError("Note content is required.", 400);
  }

  const parsedContent = parseStoredNoteContent(content.trim());

  return {
    author: typeof author === "string" && author.trim() ? author.trim() : "anonymous",
    title: typeof title === "string" ? title.trim() : parsedContent?.title || "",
    tag: typeof tag === "string" && tag.trim() ? tag.trim() : parsedContent?.tag || "General",
    content: parsedContent?.content || content.trim(),
  };
}

module.exports = {
  validateNotePayload,
};
