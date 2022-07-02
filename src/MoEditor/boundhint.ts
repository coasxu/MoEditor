import { Caret, Position } from "./types";
import * as op from "./dom";

const whiteSpace = "";

const leftTag = {
  // 'p': "",
  // 'td': "'",
  // 'li': "",
  b: "**",
  i: "*",
  s: "~",
  u: "\u00a0",
  code: "`",
  // 'span': " ",
  // 'h1': '\u00a0',
  // 'h2': '\u00a0',
  // 'h3': '\u00a0',
  // 'h4': '\u00a0',
  // 'h5': '\u00a0',
  default: "\u00a0",
};

const rightTag = {
  // 'p': "\u00a0",
  // 'li': "",
  // 'td': "'",
  b: "**",
  i: "*",
  s: "~",
  u: "\u00a0",
  // 'ul': '',
  // 'ol': '',
  code: "`",
  // 'span': " ",
  // 'h1': '\u00a0',
  // 'h2': '\u00a0',
  // 'h3': '\u00a0',
  // 'h4': '\u00a0',
  // 'h5': '\u00a0',
  default: "\u00a0",
};

function createSpan(...className: string[]) {
  const span = document.createElement("span");
  className.forEach((item) => span.classList.add(item));
  return span;
}

/**
 * to display current user caret element bound
 */
export class BoundHint {
  ref: Node;
  left: HTMLSpanElement;
  right: HTMLSpanElement;

  leftText: HTMLSpanElement;
  rightText: HTMLSpanElement;
  text: Text;
  static _instance = null;
  constructor() {
    this.left = createSpan("bound-hint-left", "bound-hint");
    this.right = createSpan("bound-hint-right", "bound-hint");
    this.leftText = createSpan(
      "bound-hint-left",
      "bound-hint",
      "bound-hint-text"
    );
    this.leftText.textContent = "\u00a0";
    this.rightText = createSpan(
      "bound-hint-right",
      "bound-hint",
      "bound-hint-text"
    );
    this.rightText.textContent = "\u00a0";

    this.text = document.createTextNode(" ");
    this.ref = null;
    if (BoundHint._instance) {
      return BoundHint._instance;
    }
    BoundHint._instance = this;
  }

  isBoundhint(el: HTMLElement) {
    return op.isTag(el, "span") && el.classList.contains("bound-hint");
  }

  /**
   * **bold *italic*| **
   * **bold italic  | **
   *  ↑            ↑   ↑
   * style        space
   * hint         hint
   */
  hintStyle(el: HTMLElement) {
    const styleName = op.getTagName(el);
    if (leftTag[styleName]) {
      this.left.textContent = leftTag[styleName];
      this.right.textContent = rightTag[styleName];
      el.insertBefore(this.left, el.firstChild);
      el.appendChild(this.right);
    } else {
      this._removeElementl(this.left, this.right);
    }
  }
  hintSpace(el: Text) {
    // debugger;
    // if (el.textContent === "") {
    //   el.textContent = "\u00a0";
    // }

    const left = op.firstNeighborTextNode(el);
    const right = op.lastNeighborTextNode(el);
    console.log([left.textContent, right.textContent]);
    if (op.previousValidNode(left) && left.previousSibling !== this.left) {
      left.parentElement.insertBefore(this.leftText, left);
    } else {
      this._removeElementl(this.leftText);
    }

    if (op.nextValidNode(right) && right.nextSibling !== this.right) {
      right.parentElement.insertBefore(this.rightText, right.nextSibling);
    } else {
      this._removeElementl(this.rightText);
    }
  }
  _safeOffset(
    container: Node,
    offset: number,
    type: "left" | "right" | "inner" = "inner"
  ) {
    let newContainer, newOffset;
    if (op.isTag(container, "#text")) {
      return { container, offset };
    }
    newOffset = 0;
    if (!container.childNodes[offset]) {
      if (op.isTag(op.lastValidChild(container), "#text")) {
        newContainer = op.lastValidChild(container);
        newOffset = newContainer.textContent.length;
      } else {
        // if(ty
        while (!container.childNodes[offset]) {
          newContainer = document.createTextNode(whiteSpace);
          container.appendChild(newContainer);
        }
      }
    } else {
      // (!op.isTag(container.childNodes[offset], "#text"))
      newContainer = document.createTextNode(whiteSpace);
      container.insertBefore(newContainer, container.childNodes[offset]);
    }
    return {
      container: newContainer,
      offset: newOffset,
    };
  }
  safeMousePosition() {
    const sel = document.getSelection();
    if (!sel) {
      return;
    }
    const range = sel.getRangeAt(0);
    if (
      range.startContainer === range.endContainer &&
      range.startOffset === range.endOffset
    ) {
      const container = range.startContainer;
      const offset = range.startOffset;
      if (op.isTag(container, "#text")) {
        if (!this.isBoundhint(container.parentElement)) {
          return;
        }

        let newContainer = container.parentElement as Node;
        let newPos: Position;
        if (newContainer === this.right || newContainer === this.rightText) {
          if (offset === this.right.textContent.length) {
            newPos = op.nextValidPosition(
              newContainer.parentElement.parentElement,
              newContainer.parentElement,
              newContainer.parentElement.childNodes.length
            );
          } else {
            newContainer = op.previousValidNode(newContainer);
            newPos = new Position(
              newContainer,
              newContainer.textContent.length
            );
          }
        } else if (
          newContainer === this.left ||
          newContainer === this.leftText
        ) {
          if (offset === 0) {
            newPos = op.previousValidPosition(
              newContainer.parentElement.parentElement,
              newContainer.parentElement,
              0
            );
          } else {
            newContainer = op.nextValidNode(newContainer);
            newPos = new Position(newContainer, 0);
          }
        } else {
          debugger;
        }
        newPos = this.safePosition(newPos);
        range.setStart(newPos.container, newPos.offset);
        range.setEnd(newPos.container, newPos.offset);
      } else {
        const { container: newContainer, offset: newOffset } = this._safeOffset(
          container,
          offset
        );

        range.setStart(newContainer, newOffset);
        range.setEnd(newContainer, newOffset);
      }
    }
  }

  safePosition(pos: Position): Position {
    const { container, offset } = pos;
    const { container: newContainer, offset: newOffset } = this._safeOffset(
      container,
      offset
    );

    return new Position(newContainer, newOffset, pos.root);
  }

  autoUpdate(kwargs?: { force: boolean }) {
    const { force } = kwargs || {};
    const sel = document.getSelection();
    if (!sel) {
      this.remove();
      return;
    }
    var el: Node;
    var multiSelect = false;
    var offset = 0;
    const range = sel.getRangeAt(0);
    if (
      range.startContainer === range.endContainer &&
      range.startOffset === range.endOffset
    ) {
      el = range.startContainer;
      offset = range.startOffset;
      const { container, offset: newOffset } = this._safeOffset(el, offset);
      el = container;
      offset = newOffset;
    } else {
      // debugger;
      el = range.commonAncestorContainer;
      const { container: startContainer, offset: startOffset } =
        this._safeOffset(range.startContainer, range.startOffset);
      const { container: endContainer, offset: endOffset } = this._safeOffset(
        range.endContainer,
        range.endOffset
      );
      range.setStart(startContainer, startOffset);
      range.setEnd(endContainer, endOffset);
      multiSelect = true;
    }
    if (el === this.ref && !force) {
      return;
    }

    if (!op.isTag(el, "#text")) {
      el = el.childNodes[offset];
    }

    this.hintStyle(el.parentElement);
    if (!multiSelect) {
      this.hintSpace(el as Text);
    }
    this.ref = el;
  }
  update(caret: Caret) {}

  _removeElementl(...el: HTMLElement[]) {
    el.forEach((item) => {
      if (item.parentElement) {
        item.remove();
      }
    });
  }

  remove() {
    this._removeElementl(this.left, this.right);

    if (this.text.textContent.trim() === "" && this.text.parentElement) {
      this.text.parentElement.removeChild(this.text);
    } else {
      this.text = document.createTextNode("");
    }
  }
}

/**
 * to display other user position
 */
export class CaretHint {}
