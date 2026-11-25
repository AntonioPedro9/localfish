export function isUserFocusingInputElement(): boolean {
  const activeElement = document.activeElement;
  if (!activeElement) {
    return false;
  }

  const isTextInput = activeElement instanceof HTMLInputElement;
  const isTextArea = activeElement instanceof HTMLTextAreaElement;
  const isCustomTextbox = activeElement.getAttribute("role") === "textbox";

  return isTextInput || isTextArea || isCustomTextbox;
}
