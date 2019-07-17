/**!
 * @fileOverview Kickass library to create and place poppers near their reference elements.
 * @version 1.14.5
 * @license
 * Copyright (c) 2016 Federico Zivolo and contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.Popper = factory());
}(this, (function () { 'use strict';

var isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

var longerTimeoutBrowsers = ['Edge', 'Trident', 'Firefox'];
var timeoutDuration = 0;
for (var i = 0; i < longerTimeoutBrowsers.length; i += 1) {
  if (isBrowser && navigator.userAgent.indexOf(longerTimeoutBrowsers[i]) >= 0) {
    timeoutDuration = 1;
    break;
  }
}

function microtaskDebounce(fn) {
  var called = false;
  return function () {
    if (called) {
      return;
    }
    called = true;
    window.Promise.resolve().then(function () {
      called = false;
      fn();
    });
  };
}

function taskDebounce(fn) {
  var scheduled = false;
  return function () {
    if (!scheduled) {
      scheduled = true;
      setTimeout(function () {
        scheduled = false;
        fn();
      }, timeoutDuration);
    }
  };
}

var supportsMicroTasks = isBrowser && window.Promise;

/**
* Create a debounced version of a method, that's asynchronously deferred
* but called in the minimum time possible.
*
* @method
* @memberof Popper.Utils
* @argument {Function} fn
* @returns {Function}
*/
var debounce = supportsMicroTasks ? microtaskDebounce : taskDebounce;

/**
 * Check if the given variable is a function
 * @method
 * @memberof Popper.Utils
 * @argument {Any} functionToCheck - variable to check
 * @returns {Boolean} answer to: is a function?
 */
function isFunction(functionToCheck) {
  var getType = {};
  return functionToCheck && getType.toString.call(functionToCheck) === '[object Function]';
}

/**
 * Get CSS computed property of the given element
 * @method
 * @memberof Popper.Utils
 * @argument {Eement} element
 * @argument {String} property
 */
function getStyleComputedProperty(element, property) {
  if (element.nodeType !== 1) {
    return [];
  }
  // NOTE: 1 DOM access here
  var window = element.ownerDocument.defaultView;
  var css = window.getComputedStyle(element, null);
  return property ? css[property] : css;
}

/**
 * Returns the parentNode or the host of the element
 * @method
 * @memberof Popper.Utils
 * @argument {Element} element
 * @returns {Element} parent
 */
function getParentNode(element) {
  if (element.nodeName === 'HTML') {
    return element;
  }
  return element.parentNode || element.host;
}

/**
 * Returns the scrolling parent of the given element
 * @method
 * @memberof Popper.Utils
 * @argument {Element} element
 * @returns {Element} scroll parent
 */
function getScrollParent(element) {
  // Return body, `getScroll` will take care to get the correct `scrollTop` from it
  if (!element) {
    return document.body;
  }

  switch (element.nodeName) {
    case 'HTML':
    case 'BODY':
      return element.ownerDocument.body;
    case '#document':
      return element.body;
  }

  // Firefox want us to check `-x` and `-y` variations as well

  var _getStyleComputedProp = getStyleComputedProperty(element),
      overflow = _getStyleComputedProp.overflow,
      overflowX = _getStyleComputedProp.overflowX,
      overflowY = _getStyleComputedProp.overflowY;

  if (/(auto|scroll|overlay)/.test(overflow + overflowY + overflowX)) {
    return element;
  }

  return getScrollParent(getParentNode(element));
}

var isIE11 = isBrowser && !!(window.MSInputMethodContext && document.documentMode);
var isIE10 = isBrowser && /MSIE 10/.test(navigator.userAgent);

/**
 * Determines if the browser is Internet Explorer
 * @method
 * @memberof Popper.Utils
 * @param {Number} version to check
 * @returns {Boolean} isIE
 */
function isIE(version) {
  if (version === 11) {
    return isIE11;
  }
  if (version === 10) {
    return isIE10;
  }
  return isIE11 || isIE10;
}

/**
 * Returns the offset parent of the given element
 * @method
 * @memberof Popper.Utils
 * @argument {Element} element
 * @returns {Element} offset parent
 */
function getOffsetParent(element) {
  if (!element) {
    return document.documentElement;
  }

  var noOffsetParent = isIE(10) ? document.body : null;

  // NOTE: 1 DOM access here
  var offsetParent = element.offsetParent || null;
  // Skip hidden elements which don't have an offsetParent
  while (offsetParent === noOffsetParent && element.nextElementSibling) {
    offsetParent = (element = element.nextElementSibling).offsetParent;
  }

  var nodeName = offsetParent && offsetParent.nodeName;

  if (!nodeName || nodeName === 'BODY' || nodeName === 'HTML') {
    return element ? element.ownerDocument.documentElement : document.documentElement;
  }

  // .offsetParent will return the closest TH, TD or TABLE in case
  // no offsetParent is present, I hate this job...
  if (['TH', 'TD', 'TABLE'].indexOf(offsetParent.nodeName) !== -1 && getStyleComputedProperty(offsetParent, 'position') === 'static') {
    return getOffsetParent(offsetParent);
  }

  return offsetParent;
}

function isOffsetContainer(element) {
  var nodeName = element.nodeName;

  if (nodeName === 'BODY') {
    return false;
  }
  return nodeName === 'HTML' || getOffsetParent(element.firstElementChild) === element;
}

/**
 * Finds the root node (document, shadowDOM root) of the given element
 * @method
 * @memberof Popper.Utils
 * @argument {Element} node
 * @returns {Element} root node
 */
function getRoot(node) {
  if (node.parentNode !== null) {
    return getRoot(node.parentNode);
  }

  return node;
}

/**
 * Finds the offset parent common to the two provided nodes
 * @method
 * @memberof Popper.Utils
 * @argument {Element} element1
 * @argument {Element} element2
 * @returns {Element} common offset parent
 */
function findCommonOffsetParent(element1, element2) {
  // This check is needed to avoid errors in case one of the elements isn't defined for any reason
  if (!element1 || !element1.nodeType || !element2 || !element2.nodeType) {
    return document.documentElement;
  }

  // Here we make sure to give as "start" the element that comes first in the DOM
  var order = element1.compareDocumentPosition(element2) & Node.DOCUMENT_POSITION_FOLLOWING;
  var start = order ? element1 : element2;
  var end = order ? element2 : element1;

  // Get common ancestor container
  var range = document.createRange();
  range.setStart(start, 0);
  range.setEnd(end, 0);
  var commonAncestorContainer = range.commonAncestorContainer;

  // Both nodes are inside #document

  if (element1 !== commonAncestorContainer && element2 !== commonAncestorContainer || start.contains(end)) {
    if (isOffsetContainer(commonAncestorContainer)) {
      return commonAncestorContainer;
    }

    return getOffsetParent(commonAncestorContainer);
  }

  // one of the nodes is inside shadowDOM, find which one
  var element1root = getRoot(element1);
  if (element1root.host) {
    return findCommonOffsetParent(element1root.host, element2);
  } else {
    return findCommonOffsetParent(element1, getRoot(element2).host);
  }
}

/**
 * Gets the scroll value of the given element in the given side (top and left)
 * @method
 * @memberof Popper.Utils
 * @argument {Element} element
 * @argument {String} side `top` or `left`
 * @returns {number} amount of scrolled pixels
 */
function getScroll(element) {
  var side = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'top';

  var upperSide = side === 'top' ? 'scrollTop' : 'scrollLeft';
  var nodeName = element.nodeName;

  if (nodeName === 'BODY' || nodeName === 'HTML') {
    var html = element.ownerDocument.documentElement;
    var scrollingElement = element.ownerDocument.scrollingElement || html;
    return scrollingElement[upperSide];
  }

  return element[upperSide];
}

/*
 * Sum or subtract the element scroll values (left and top) from a given rect object
 * @method
 * @memberof Popper.Utils
 * @param {Object} rect - Rect object you want to change
 * @param {HTMLElement} element - The element from the function reads the scroll values
 * @param {Boolean} subtract - set to true if you want to subtract the scroll values
 * @return {Object} rect - The modifier rect object
 */
function includeScroll(rect, element) {
  var subtract = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

  var scrollTop = getScroll(element, 'top');
  var scrollLeft = getScroll(element, 'left');
  var modifier = subtract ? -1 : 1;
  rect.top += scrollTop * modifier;
  rect.bottom += scrollTop * modifier;
  rect.left += scrollLeft * modifier;
  rect.right += scrollLeft * modifier;
  return rect;
}

/*
 * Helper to detect borders of a given element
 * @method
 * @memberof Popper.Utils
 * @param {CSSStyleDeclaration} styles
 * Result of `getStyleComputedProperty` on the given element
 * @param {String} axis - `x` or `y`
 * @return {number} borders - The borders size of the given axis
 */

function getBordersSize(styles, axis) {
  var sideA = axis === 'x' ? 'Left' : 'Top';
  var sideB = sideA === 'Left' ? 'Right' : 'Bottom';

  return parseFloat(styles['border' + sideA + 'Width'], 10) + parseFloat(styles['border' + sideB + 'Width'], 10);
}

function getSize(axis, body, html, computedStyle) {
  return Math.max(body['offset' + axis], body['scroll' + axis], html['client' + axis], html['offset' + axis], html['scroll' + axis], isIE(10) ? parseInt(html['offset' + axis]) + parseInt(computedStyle['margin' + (axis === 'Height' ? 'Top' : 'Left')]) + parseInt(computedStyle['margin' + (axis === 'Height' ? 'Bottom' : 'Right')]) : 0);
}

function getWindowSizes(document) {
  var body = document.body;
  var html = document.documentElement;
  var computedStyle = isIE(10) && getComputedStyle(html);

  return {
    height: getSize('Height', body, html, computedStyle),
    width: getSize('Width', body, html, computedStyle)
  };
}

var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();





var defineProperty = function (obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }

  return obj;
};

var _extends = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};

/**
 * Given element offsets, generate an output similar to getBoundingClientRect
 * @method
 * @memberof Popper.Utils
 * @argument {Object} offsets
 * @returns {Object} ClientRect like output
 */
function getClientRect(offsets) {
  return _extends({}, offsets, {
    right: offsets.left + offsets.width,
    bottom: offsets.top + offsets.height
  });
}

/**
 * Get bounding client rect of given element
 * @method
 * @memberof Popper.Utils
 * @param {HTMLElement} element
 * @return {Object} client rect
 */
function getBoundingClientRect(element) {
  var rect = {};

  // IE10 10 FIX: Please, don't ask, the element isn't
  // considered in DOM in some circumstances...
  // This isn't reproducible in IE10 compatibility mode of IE11
  try {
    if (isIE(10)) {
      rect = element.getBoundingClientRect();
      var scrollTop = getScroll(element, 'top');
      var scrollLeft = getScroll(element, 'left');
      rect.top += scrollTop;
      rect.left += scrollLeft;
      rect.bottom += scrollTop;
      rect.right += scrollLeft;
    } else {
      rect = element.getBoundingClientRect();
    }
  } catch (e) {}

  var result = {
    left: rect.left,
    top: rect.top,
    width: rect.right - rect.left,
    height: rect.bottom - rect.top
  };

  // subtract scrollbar size from sizes
  var sizes = element.nodeName === 'HTML' ? getWindowSizes(element.ownerDocument) : {};
  var width = sizes.width || element.clientWidth || result.right - result.left;
  var height = sizes.height || element.clientHeight || result.bottom - result.top;

  var horizScrollbar = element.offsetWidth - width;
  var vertScrollbar = element.offsetHeight - height;

  // if an hypothetical scrollbar is detected, we must be sure it's not a `border`
  // we make this check conditional for performance reasons
  if (horizScrollbar || vertScrollbar) {
    var styles = getStyleComputedProperty(element);
    horizScrollbar -= getBordersSize(styles, 'x');
    vertScrollbar -= getBordersSize(styles, 'y');

    result.width -= horizScrollbar;
    result.height -= vertScrollbar;
  }

  return getClientRect(result);
}

function getOffsetRectRelativeToArbitraryNode(children, parent) {
  var fixedPosition = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

  var isIE10 = isIE(10);
  var isHTML = parent.nodeName === 'HTML';
  var childrenRect = getBoundingClientRect(children);
  var parentRect = getBoundingClientRect(parent);
  var scrollParent = getScrollParent(children);

  var styles = getStyleComputedProperty(parent);
  var borderTopWidth = parseFloat(styles.borderTopWidth, 10);
  var borderLeftWidth = parseFloat(styles.borderLeftWidth, 10);

  // In cases where the parent is fixed, we must ignore negative scroll in offset calc
  if (fixedPosition && isHTML) {
    parentRect.top = Math.max(parentRect.top, 0);
    parentRect.left = Math.max(parentRect.left, 0);
  }
  var offsets = getClientRect({
    top: childrenRect.top - parentRect.top - borderTopWidth,
    left: childrenRect.left - parentRect.left - borderLeftWidth,
    width: childrenRect.width,
    height: childrenRect.height
  });
  offsets.marginTop = 0;
  offsets.marginLeft = 0;

  // Subtract margins of documentElement in case it's being used as parent
  // we do this only on HTML because it's the only element that behaves
  // differently when margins are applied to it. The margins are included in
  // the box of the documentElement, in the other cases not.
  if (!isIE10 && isHTML) {
    var marginTop = parseFloat(styles.marginTop, 10);
    var marginLeft = parseFloat(styles.marginLeft, 10);

    offsets.top -= borderTopWidth - marginTop;
    offsets.bottom -= borderTopWidth - marginTop;
    offsets.left -= borderLeftWidth - marginLeft;
    offsets.right -= borderLeftWidth - marginLeft;

    // Attach marginTop and marginLeft because in some circumstances we may need them
    offsets.marginTop = marginTop;
    offsets.marginLeft = marginLeft;
  }

  if (isIE10 && !fixedPosition ? parent.contains(scrollParent) : parent === scrollParent && scrollParent.nodeName !== 'BODY') {
    offsets = includeScroll(offsets, parent);
  }

  return offsets;
}

function getViewportOffsetRectRelativeToArtbitraryNode(element) {
  var excludeScroll = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

  var html = element.ownerDocument.documentElement;
  var relativeOffset = getOffsetRectRelativeToArbitraryNode(element, html);
  var width = Math.max(html.clientWidth, window.innerWidth || 0);
  var height = Math.max(html.clientHeight, window.innerHeight || 0);

  var scrollTop = !excludeScroll ? getScroll(html) : 0;
  var scrollLeft = !excludeScroll ? getScroll(html, 'left') : 0;

  var offset = {
    top: scrollTop - relativeOffset.top + relativeOffset.marginTop,
    left: scrollLeft - relativeOffset.left + relativeOffset.marginLeft,
    width: width,
    height: height
  };

  return getClientRect(offset);
}

/**
 * Check if the given element is fixed or is inside a fixed parent
 * @method
 * @memberof Popper.Utils
 * @argument {Element} element
 * @argument {Element} customContainer
 * @returns {Boolean} answer to "isFixed?"
 */
function isFixed(element) {
  var nodeName = element.nodeName;
  if (nodeName === 'BODY' || nodeName === 'HTML') {
    return false;
  }
  if (getStyleComputedProperty(element, 'position') === 'fixed') {
    return true;
  }
  return isFixed(getParentNode(element));
}

/**
 * Finds the first parent of an element that has a transformed property defined
 * @method
 * @memberof Popper.Utils
 * @argument {Element} element
 * @returns {Element} first transformed parent or documentElement
 */

function getFixedPositionOffsetParent(element) {
  // This check is needed to avoid errors in case one of the elements isn't defined for any reason
  if (!element || !element.parentElement || isIE()) {
    return document.documentElement;
  }
  var el = element.parentElement;
  while (el && getStyleComputedProperty(el, 'transform') === 'none') {
    el = el.parentElement;
  }
  return el || document.documentElement;
}

/**
 * Computed the boundaries limits and return them
 * @method
 * @memberof Popper.Utils
 * @param {HTMLElement} popper
 * @param {HTMLElement} reference
 * @param {number} padding
 * @param {HTMLElement} boundariesElement - Element used to define the boundaries
 * @param {Boolean} fixedPosition - Is in fixed position mode
 * @returns {Object} Coordinates of the boundaries
 */
function getBoundaries(popper, reference, padding, boundariesElement) {
  var fixedPosition = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : false;

  // NOTE: 1 DOM access here

  var boundaries = { top: 0, left: 0 };
  var offsetParent = fixedPosition ? getFixedPositionOffsetParent(popper) : findCommonOffsetParent(popper, reference);

  // Handle viewport case
  if (boundariesElement === 'viewport') {
    boundaries = getViewportOffsetRectRelativeToArtbitraryNode(offsetParent, fixedPosition);
  } else {
    // Handle other cases based on DOM element used as boundaries
    var boundariesNode = void 0;
    if (boundariesElement === 'scrollParent') {
      boundariesNode = getScrollParent(getParentNode(reference));
      if (boundariesNode.nodeName === 'BODY') {
        boundariesNode = popper.ownerDocument.documentElement;
      }
    } else if (boundariesElement === 'window') {
      boundariesNode = popper.ownerDocument.documentElement;
    } else {
      boundariesNode = boundariesElement;
    }

    var offsets = getOffsetRectRelativeToArbitraryNode(boundariesNode, offsetParent, fixedPosition);

    // In case of HTML, we need a different computation
    if (boundariesNode.nodeName === 'HTML' && !isFixed(offsetParent)) {
      var _getWindowSizes = getWindowSizes(popper.ownerDocument),
          height = _getWindowSizes.height,
          width = _getWindowSizes.width;

      boundaries.top += offsets.top - offsets.marginTop;
      boundaries.bottom = height + offsets.top;
      boundaries.left += offsets.left - offsets.marginLeft;
      boundaries.right = width + offsets.left;
    } else {
      // for all the other DOM elements, this one is good
      boundaries = offsets;
    }
  }

  // Add paddings
  padding = padding || 0;
  var isPaddingNumber = typeof padding === 'number';
  boundaries.left += isPaddingNumber ? padding : padding.left || 0;
  boundaries.top += isPaddingNumber ? padding : padding.top || 0;
  boundaries.right -= isPaddingNumber ? padding : padding.right || 0;
  boundaries.bottom -= isPaddingNumber ? padding : padding.bottom || 0;

  return boundaries;
}

function getArea(_ref) {
  var width = _ref.width,
      height = _ref.height;

  return width * height;
}

/**
 * Utility used to transform the `auto` placement to the placement with more
 * available space.
 * @method
 * @memberof Popper.Utils
 * @argument {Object} data - The data object generated by update method
 * @argument {Object} options - Modifiers configuration and options
 * @returns {Object} The data object, properly modified
 */
function computeAutoPlacement(placement, refRect, popper, reference, boundariesElement) {
  var padding = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : 0;

  if (placement.indexOf('auto') === -1) {
    return placement;
  }

  var boundaries = getBoundaries(popper, reference, padding, boundariesElement);

  var rects = {
    top: {
      width: boundaries.width,
      height: refRect.top - boundaries.top
    },
    right: {
      width: boundaries.right - refRect.right,
      height: boundaries.height
    },
    bottom: {
      width: boundaries.width,
      height: boundaries.bottom - refRect.bottom
    },
    left: {
      width: refRect.left - boundaries.left,
      height: boundaries.height
    }
  };

  var sortedAreas = Object.keys(rects).map(function (key) {
    return _extends({
      key: key
    }, rects[key], {
      area: getArea(rects[key])
    });
  }).sort(function (a, b) {
    return b.area - a.area;
  });

  var filteredAreas = sortedAreas.filter(function (_ref2) {
    var width = _ref2.width,
        height = _ref2.height;
    return width >= popper.clientWidth && height >= popper.clientHeight;
  });

  var computedPlacement = filteredAreas.length > 0 ? filteredAreas[0].key : sortedAreas[0].key;

  var variation = placement.split('-')[1];

  return computedPlacement + (variation ? '-' + variation : '');
}

/**
 * Get offsets to the reference element
 * @method
 * @memberof Popper.Utils
 * @param {Object} state
 * @param {Element} popper - the popper element
 * @param {Element} reference - the reference element (the popper will be relative to this)
 * @param {Element} fixedPosition - is in fixed position mode
 * @returns {Object} An object containing the offsets which will be applied to the popper
 */
function getReferenceOffsets(state, popper, reference) {
  var fixedPosition = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;

  var commonOffsetParent = fixedPosition ? getFixedPositionOffsetParent(popper) : findCommonOffsetParent(popper, reference);
  return getOffsetRectRelativeToArbitraryNode(reference, commonOffsetParent, fixedPosition);
}

/**
 * Get the outer sizes of the given element (offset size + margins)
 * @method
 * @memberof Popper.Utils
 * @argument {Element} element
 * @returns {Object} object containing width and height properties
 */
function getOuterSizes(element) {
  var window = element.ownerDocument.defaultView;
  var styles = window.getComputedStyle(element);
  var x = parseFloat(styles.marginTop) + parseFloat(styles.marginBottom);
  var y = parseFloat(styles.marginLeft) + parseFloat(styles.marginRight);
  var result = {
    width: element.offsetWidth + y,
    height: element.offsetHeight + x
  };
  return result;
}

/**
 * Get the opposite placement of the given one
 * @method
 * @memberof Popper.Utils
 * @argument {String} placement
 * @returns {String} flipped placement
 */
function getOppositePlacement(placement) {
  var hash = { left: 'right', right: 'left', bottom: 'top', top: 'bottom' };
  return placement.replace(/left|right|bottom|top/g, function (matched) {
    return hash[matched];
  });
}

/**
 * Get offsets to the popper
 * @method
 * @memberof Popper.Utils
 * @param {Object} position - CSS position the Popper will get applied
 * @param {HTMLElement} popper - the popper element
 * @param {Object} referenceOffsets - the reference offsets (the popper will be relative to this)
 * @param {String} placement - one of the valid placement options
 * @returns {Object} popperOffsets - An object containing the offsets which will be applied to the popper
 */
function getPopperOffsets(popper, referenceOffsets, placement) {
  placement = placement.split('-')[0];

  // Get popper node sizes
  var popperRect = getOuterSizes(popper);

  // Add position, width and height to our offsets object
  var popperOffsets = {
    width: popperRect.width,
    height: popperRect.height
  };

  // depending by the popper placement we have to compute its offsets slightly differently
  var isHoriz = ['right', 'left'].indexOf(placement) !== -1;
  var mainSide = isHoriz ? 'top' : 'left';
  var secondarySide = isHoriz ? 'left' : 'top';
  var measurement = isHoriz ? 'height' : 'width';
  var secondaryMeasurement = !isHoriz ? 'height' : 'width';

  popperOffsets[mainSide] = referenceOffsets[mainSide] + referenceOffsets[measurement] / 2 - popperRect[measurement] / 2;
  if (placement === secondarySide) {
    popperOffsets[secondarySide] = referenceOffsets[secondarySide] - popperRect[secondaryMeasurement];
  } else {
    popperOffsets[secondarySide] = referenceOffsets[getOppositePlacement(secondarySide)];
  }

  return popperOffsets;
}

/**
 * Mimics the `find` method of Array
 * @method
 * @memberof Popper.Utils
 * @argument {Array} arr
 * @argument prop
 * @argument value
 * @returns index or -1
 */
function find(arr, check) {
  // use native find if supported
  if (Array.prototype.find) {
    return arr.find(check);
  }

  // use `filter` to obtain the same behavior of `find`
  return arr.filter(check)[0];
}

/**
 * Return the index of the matching object
 * @method
 * @memberof Popper.Utils
 * @argument {Array} arr
 * @argument prop
 * @argument value
 * @returns index or -1
 */
function findIndex(arr, prop, value) {
  // use native findIndex if supported
  if (Array.prototype.findIndex) {
    return arr.findIndex(function (cur) {
      return cur[prop] === value;
    });
  }

  // use `find` + `indexOf` if `findIndex` isn't supported
  var match = find(arr, function (obj) {
    return obj[prop] === value;
  });
  return arr.indexOf(match);
}

/**
 * Loop trough the list of modifiers and run them in order,
 * each of them will then edit the data object.
 * @method
 * @memberof Popper.Utils
 * @param {dataObject} data
 * @param {Array} modifiers
 * @param {String} ends - Optional modifier name used as stopper
 * @returns {dataObject}
 */
function runModifiers(modifiers, data, ends) {
  var modifiersToRun = ends === undefined ? modifiers : modifiers.slice(0, findIndex(modifiers, 'name', ends));

  modifiersToRun.forEach(function (modifier) {
    if (modifier['function']) {
      // eslint-disable-line dot-notation
      console.warn('`modifier.function` is deprecated, use `modifier.fn`!');
    }
    var fn = modifier['function'] || modifier.fn; // eslint-disable-line dot-notation
    if (modifier.enabled && isFunction(fn)) {
      // Add properties to offsets to make them a complete clientRect object
      // we do this before each modifier to make sure the previous one doesn't
      // mess with these values
      data.offsets.popper = getClientRect(data.offsets.popper);
      data.offsets.reference = getClientRect(data.offsets.reference);

      data = fn(data, modifier);
    }
  });

  return data;
}

/**
 * Updates the position of the popper, computing the new offsets and applying
 * the new style.<br />
 * Prefer `scheduleUpdate` over `update` because of performance reasons.
 * @method
 * @memberof Popper
 */
function update() {
  // if popper is destroyed, don't perform any further update
  if (this.state.isDestroyed) {
    return;
  }

  var data = {
    instance: this,
    styles: {},
    arrowStyles: {},
    attributes: {},
    flipped: false,
    offsets: {}
  };

  // compute reference element offsets
  data.offsets.reference = getReferenceOffsets(this.state, this.popper, this.reference, this.options.positionFixed);

  // compute auto placement, store placement inside the data object,
  // modifiers will be able to edit `placement` if needed
  // and refer to originalPlacement to know the original value
  data.placement = computeAutoPlacement(this.options.placement, data.offsets.reference, this.popper, this.reference, this.options.modifiers.flip.boundariesElement, this.options.modifiers.flip.padding);

  // store the computed placement inside `originalPlacement`
  data.originalPlacement = data.placement;

  data.positionFixed = this.options.positionFixed;

  // compute the popper offsets
  data.offsets.popper = getPopperOffsets(this.popper, data.offsets.reference, data.placement);

  data.offsets.popper.position = this.options.positionFixed ? 'fixed' : 'absolute';

  // run the modifiers
  data = runModifiers(this.modifiers, data);

  // the first `update` will call `onCreate` callback
  // the other ones will call `onUpdate` callback
  if (!this.state.isCreated) {
    this.state.isCreated = true;
    this.options.onCreate(data);
  } else {
    this.options.onUpdate(data);
  }
}

/**
 * Helper used to know if the given modifier is enabled.
 * @method
 * @memberof Popper.Utils
 * @returns {Boolean}
 */
function isModifierEnabled(modifiers, modifierName) {
  return modifiers.some(function (_ref) {
    var name = _ref.name,
        enabled = _ref.enabled;
    return enabled && name === modifierName;
  });
}

/**
 * Get the prefixed supported property name
 * @method
 * @memberof Popper.Utils
 * @argument {String} property (camelCase)
 * @returns {String} prefixed property (camelCase or PascalCase, depending on the vendor prefix)
 */
function getSupportedPropertyName(property) {
  var prefixes = [false, 'ms', 'Webkit', 'Moz', 'O'];
  var upperProp = property.charAt(0).toUpperCase() + property.slice(1);

  for (var i = 0; i < prefixes.length; i++) {
    var prefix = prefixes[i];
    var toCheck = prefix ? '' + prefix + upperProp : property;
    if (typeof document.body.style[toCheck] !== 'undefined') {
      return toCheck;
    }
  }
  return null;
}

/**
 * Destroys the popper.
 * @method
 * @memberof Popper
 */
function destroy() {
  this.state.isDestroyed = true;

  // touch DOM only if `applyStyle` modifier is enabled
  if (isModifierEnabled(this.modifiers, 'applyStyle')) {
    this.popper.removeAttribute('x-placement');
    this.popper.style.position = '';
    this.popper.style.top = '';
    this.popper.style.left = '';
    this.popper.style.right = '';
    this.popper.style.bottom = '';
    this.popper.style.willChange = '';
    this.popper.style[getSupportedPropertyName('transform')] = '';
  }

  this.disableEventListeners();

  // remove the popper if user explicity asked for the deletion on destroy
  // do not use `remove` because IE11 doesn't support it
  if (this.options.removeOnDestroy) {
    this.popper.parentNode.removeChild(this.popper);
  }
  return this;
}

/**
 * Get the window associated with the element
 * @argument {Element} element
 * @returns {Window}
 */
function getWindow(element) {
  var ownerDocument = element.ownerDocument;
  return ownerDocument ? ownerDocument.defaultView : window;
}

function attachToScrollParents(scrollParent, event, callback, scrollParents) {
  var isBody = scrollParent.nodeName === 'BODY';
  var target = isBody ? scrollParent.ownerDocument.defaultView : scrollParent;
  target.addEventListener(event, callback, { passive: true });

  if (!isBody) {
    attachToScrollParents(getScrollParent(target.parentNode), event, callback, scrollParents);
  }
  scrollParents.push(target);
}

/**
 * Setup needed event listeners used to update the popper position
 * @method
 * @memberof Popper.Utils
 * @private
 */
function setupEventListeners(reference, options, state, updateBound) {
  // Resize event listener on window
  state.updateBound = updateBound;
  getWindow(reference).addEventListener('resize', state.updateBound, { passive: true });

  // Scroll event listener on scroll parents
  var scrollElement = getScrollParent(reference);
  attachToScrollParents(scrollElement, 'scroll', state.updateBound, state.scrollParents);
  state.scrollElement = scrollElement;
  state.eventsEnabled = true;

  return state;
}

/**
 * It will add resize/scroll events and start recalculating
 * position of the popper element when they are triggered.
 * @method
 * @memberof Popper
 */
function enableEventListeners() {
  if (!this.state.eventsEnabled) {
    this.state = setupEventListeners(this.reference, this.options, this.state, this.scheduleUpdate);
  }
}

/**
 * Remove event listeners used to update the popper position
 * @method
 * @memberof Popper.Utils
 * @private
 */
function removeEventListeners(reference, state) {
  // Remove resize event listener on window
  getWindow(reference).removeEventListener('resize', state.updateBound);

  // Remove scroll event listener on scroll parents
  state.scrollParents.forEach(function (target) {
    target.removeEventListener('scroll', state.updateBound);
  });

  // Reset state
  state.updateBound = null;
  state.scrollParents = [];
  state.scrollElement = null;
  state.eventsEnabled = false;
  return state;
}

/**
 * It will remove resize/scroll events and won't recalculate popper position
 * when they are triggered. It also won't trigger `onUpdate` callback anymore,
 * unless you call `update` method manually.
 * @method
 * @memberof Popper
 */
function disableEventListeners() {
  if (this.state.eventsEnabled) {
    cancelAnimationFrame(this.scheduleUpdate);
    this.state = removeEventListeners(this.reference, this.state);
  }
}

/**
 * Tells if a given input is a number
 * @method
 * @memberof Popper.Utils
 * @param {*} input to check
 * @return {Boolean}
 */
function isNumeric(n) {
  return n !== '' && !isNaN(parseFloat(n)) && isFinite(n);
}

/**
 * Set the style to the given popper
 * @method
 * @memberof Popper.Utils
 * @argument {Element} element - Element to apply the style to
 * @argument {Object} styles
 * Object with a list of properties and values which will be applied to the element
 */
function setStyles(element, styles) {
  Object.keys(styles).forEach(function (prop) {
    var unit = '';
    // add unit if the value is numeric and is one of the following
    if (['width', 'height', 'top', 'right', 'bottom', 'left'].indexOf(prop) !== -1 && isNumeric(styles[prop])) {
      unit = 'px';
    }
    element.style[prop] = styles[prop] + unit;
  });
}

/**
 * Set the attributes to the given popper
 * @method
 * @memberof Popper.Utils
 * @argument {Element} element - Element to apply the attributes to
 * @argument {Object} styles
 * Object with a list of properties and values which will be applied to the element
 */
function setAttributes(element, attributes) {
  Object.keys(attributes).forEach(function (prop) {
    var value = attributes[prop];
    if (value !== false) {
      element.setAttribute(prop, attributes[prop]);
    } else {
      element.removeAttribute(prop);
    }
  });
}

/**
 * @function
 * @memberof Modifiers
 * @argument {Object} data - The data object generated by `update` method
 * @argument {Object} data.styles - List of style properties - values to apply to popper element
 * @argument {Object} data.attributes - List of attribute properties - values to apply to popper element
 * @argument {Object} options - Modifiers configuration and options
 * @returns {Object} The same data object
 */
function applyStyle(data) {
  // any property present in `data.styles` will be applied to the popper,
  // in this way we can make the 3rd party modifiers add custom styles to it
  // Be aware, modifiers could override the properties defined in the previous
  // lines of this modifier!
  setStyles(data.instance.popper, data.styles);

  // any property present in `data.attributes` will be applied to the popper,
  // they will be set as HTML attributes of the element
  setAttributes(data.instance.popper, data.attributes);

  // if arrowElement is defined and arrowStyles has some properties
  if (data.arrowElement && Object.keys(data.arrowStyles).length) {
    setStyles(data.arrowElement, data.arrowStyles);
  }

  return data;
}

/**
 * Set the x-placement attribute before everything else because it could be used
 * to add margins to the popper margins needs to be calculated to get the
 * correct popper offsets.
 * @method
 * @memberof Popper.modifiers
 * @param {HTMLElement} reference - The reference element used to position the popper
 * @param {HTMLElement} popper - The HTML element used as popper
 * @param {Object} options - Popper.js options
 */
function applyStyleOnLoad(reference, popper, options, modifierOptions, state) {
  // compute reference element offsets
  var referenceOffsets = getReferenceOffsets(state, popper, reference, options.positionFixed);

  // compute auto placement, store placement inside the data object,
  // modifiers will be able to edit `placement` if needed
  // and refer to originalPlacement to know the original value
  var placement = computeAutoPlacement(options.placement, referenceOffsets, popper, reference, options.modifiers.flip.boundariesElement, options.modifiers.flip.padding);

  popper.setAttribute('x-placement', placement);

  // Apply `position` to popper before anything else because
  // without the position applied we can't guarantee correct computations
  setStyles(popper, { position: options.positionFixed ? 'fixed' : 'absolute' });

  return options;
}

/**
 * @function
 * @memberof Modifiers
 * @argument {Object} data - The data object generated by `update` method
 * @argument {Object} options - Modifiers configuration and options
 * @returns {Object} The data object, properly modified
 */
function computeStyle(data, options) {
  var x = options.x,
      y = options.y;
  var popper = data.offsets.popper;

  // Remove this legacy support in Popper.js v2

  var legacyGpuAccelerationOption = find(data.instance.modifiers, function (modifier) {
    return modifier.name === 'applyStyle';
  }).gpuAcceleration;
  if (legacyGpuAccelerationOption !== undefined) {
    console.warn('WARNING: `gpuAcceleration` option moved to `computeStyle` modifier and will not be supported in future versions of Popper.js!');
  }
  var gpuAcceleration = legacyGpuAccelerationOption !== undefined ? legacyGpuAccelerationOption : options.gpuAcceleration;

  var offsetParent = getOffsetParent(data.instance.popper);
  var offsetParentRect = getBoundingClientRect(offsetParent);

  // Styles
  var styles = {
    position: popper.position
  };

  // Avoid blurry text by using full pixel integers.
  // For pixel-perfect positioning, top/bottom prefers rounded
  // values, while left/right prefers floored values.
  var offsets = {
    left: Math.floor(popper.left),
    top: Math.round(popper.top),
    bottom: Math.round(popper.bottom),
    right: Math.floor(popper.right)
  };

  var sideA = x === 'bottom' ? 'top' : 'bottom';
  var sideB = y === 'right' ? 'left' : 'right';

  // if gpuAcceleration is set to `true` and transform is supported,
  //  we use `translate3d` to apply the position to the popper we
  // automatically use the supported prefixed version if needed
  var prefixedProperty = getSupportedPropertyName('transform');

  // now, let's make a step back and look at this code closely (wtf?)
  // If the content of the popper grows once it's been positioned, it
  // may happen that the popper gets misplaced because of the new content
  // overflowing its reference element
  // To avoid this problem, we provide two options (x and y), which allow
  // the consumer to define the offset origin.
  // If we position a popper on top of a reference element, we can set
  // `x` to `top` to make the popper grow towards its top instead of
  // its bottom.
  var left = void 0,
      top = void 0;
  if (sideA === 'bottom') {
    // when offsetParent is <html> the positioning is relative to the bottom of the screen (excluding the scrollbar)
    // and not the bottom of the html element
    if (offsetParent.nodeName === 'HTML') {
      top = -offsetParent.clientHeight + offsets.bottom;
    } else {
      top = -offsetParentRect.height + offsets.bottom;
    }
  } else {
    top = offsets.top;
  }
  if (sideB === 'right') {
    if (offsetParent.nodeName === 'HTML') {
      left = -offsetParent.clientWidth + offsets.right;
    } else {
      left = -offsetParentRect.width + offsets.right;
    }
  } else {
    left = offsets.left;
  }
  if (gpuAcceleration && prefixedProperty) {
    styles[prefixedProperty] = 'translate3d(' + left + 'px, ' + top + 'px, 0)';
    styles[sideA] = 0;
    styles[sideB] = 0;
    styles.willChange = 'transform';
  } else {
    // othwerise, we use the standard `top`, `left`, `bottom` and `right` properties
    var invertTop = sideA === 'bottom' ? -1 : 1;
    var invertLeft = sideB === 'right' ? -1 : 1;
    styles[sideA] = top * invertTop;
    styles[sideB] = left * invertLeft;
    styles.willChange = sideA + ', ' + sideB;
  }

  // Attributes
  var attributes = {
    'x-placement': data.placement
  };

  // Update `data` attributes, styles and arrowStyles
  data.attributes = _extends({}, attributes, data.attributes);
  data.styles = _extends({}, styles, data.styles);
  data.arrowStyles = _extends({}, data.offsets.arrow, data.arrowStyles);

  return data;
}

/**
 * Helper used to know if the given modifier depends from another one.<br />
 * It checks if the needed modifier is listed and enabled.
 * @method
 * @memberof Popper.Utils
 * @param {Array} modifiers - list of modifiers
 * @param {String} requestingName - name of requesting modifier
 * @param {String} requestedName - name of requested modifier
 * @returns {Boolean}
 */
function isModifierRequired(modifiers, requestingName, requestedName) {
  var requesting = find(modifiers, function (_ref) {
    var name = _ref.name;
    return name === requestingName;
  });

  var isRequired = !!requesting && modifiers.some(function (modifier) {
    return modifier.name === requestedName && modifier.enabled && modifier.order < requesting.order;
  });

  if (!isRequired) {
    var _requesting = '`' + requestingName + '`';
    var requested = '`' + requestedName + '`';
    console.warn(requested + ' modifier is required by ' + _requesting + ' modifier in order to work, be sure to include it before ' + _requesting + '!');
  }
  return isRequired;
}

/**
 * @function
 * @memberof Modifiers
 * @argument {Object} data - The data object generated by update method
 * @argument {Object} options - Modifiers configuration and options
 * @returns {Object} The data object, properly modified
 */
function arrow(data, options) {
  var _data$offsets$arrow;

  // arrow depends on keepTogether in order to work
  if (!isModifierRequired(data.instance.modifiers, 'arrow', 'keepTogether')) {
    return data;
  }

  var arrowElement = options.element;

  // if arrowElement is a string, suppose it's a CSS selector
  if (typeof arrowElement === 'string') {
    arrowElement = data.instance.popper.querySelector(arrowElement);

    // if arrowElement is not found, don't run the modifier
    if (!arrowElement) {
      return data;
    }
  } else {
    // if the arrowElement isn't a query selector we must check that the
    // provided DOM node is child of its popper node
    if (!data.instance.popper.contains(arrowElement)) {
      console.warn('WARNING: `arrow.element` must be child of its popper element!');
      return data;
    }
  }

  var placement = data.placement.split('-')[0];
  var _data$offsets = data.offsets,
      popper = _data$offsets.popper,
      reference = _data$offsets.reference;

  var isVertical = ['left', 'right'].indexOf(placement) !== -1;

  var len = isVertical ? 'height' : 'width';
  var sideCapitalized = isVertical ? 'Top' : 'Left';
  var side = sideCapitalized.toLowerCase();
  var altSide = isVertical ? 'left' : 'top';
  var opSide = isVertical ? 'bottom' : 'right';
  var arrowElementSize = getOuterSizes(arrowElement)[len];

  //
  // extends keepTogether behavior making sure the popper and its
  // reference have enough pixels in conjunction
  //

  // top/left side
  if (reference[opSide] - arrowElementSize < popper[side]) {
    data.offsets.popper[side] -= popper[side] - (reference[opSide] - arrowElementSize);
  }
  // bottom/right side
  if (reference[side] + arrowElementSize > popper[opSide]) {
    data.offsets.popper[side] += reference[side] + arrowElementSize - popper[opSide];
  }
  data.offsets.popper = getClientRect(data.offsets.popper);

  // compute center of the popper
  var center = reference[side] + reference[len] / 2 - arrowElementSize / 2;

  // Compute the sideValue using the updated popper offsets
  // take popper margin in account because we don't have this info available
  var css = getStyleComputedProperty(data.instance.popper);
  var popperMarginSide = parseFloat(css['margin' + sideCapitalized], 10);
  var popperBorderSide = parseFloat(css['border' + sideCapitalized + 'Width'], 10);
  var sideValue = center - data.offsets.popper[side] - popperMarginSide - popperBorderSide;

  // prevent arrowElement from being placed not contiguously to its popper
  sideValue = Math.max(Math.min(popper[len] - arrowElementSize, sideValue), 0);

  data.arrowElement = arrowElement;
  data.offsets.arrow = (_data$offsets$arrow = {}, defineProperty(_data$offsets$arrow, side, Math.round(sideValue)), defineProperty(_data$offsets$arrow, altSide, ''), _data$offsets$arrow);

  return data;
}

/**
 * Get the opposite placement variation of the given one
 * @method
 * @memberof Popper.Utils
 * @argument {String} placement variation
 * @returns {String} flipped placement variation
 */
function getOppositeVariation(variation) {
  if (variation === 'end') {
    return 'start';
  } else if (variation === 'start') {
    return 'end';
  }
  return variation;
}

/**
 * List of accepted placements to use as values of the `placement` option.<br />
 * Valid placements are:
 * - `auto`
 * - `top`
 * - `right`
 * - `bottom`
 * - `left`
 *
 * Each placement can have a variation from this list:
 * - `-start`
 * - `-end`
 *
 * Variations are interpreted easily if you think of them as the left to right
 * written languages. Horizontally (`top` and `bottom`), `start` is left and `end`
 * is right.<br />
 * Vertically (`left` and `right`), `start` is top and `end` is bottom.
 *
 * Some valid examples are:
 * - `top-end` (on top of reference, right aligned)
 * - `right-start` (on right of reference, top aligned)
 * - `bottom` (on bottom, centered)
 * - `auto-end` (on the side with more space available, alignment depends by placement)
 *
 * @static
 * @type {Array}
 * @enum {String}
 * @readonly
 * @method placements
 * @memberof Popper
 */
var placements = ['auto-start', 'auto', 'auto-end', 'top-start', 'top', 'top-end', 'right-start', 'right', 'right-end', 'bottom-end', 'bottom', 'bottom-start', 'left-end', 'left', 'left-start'];

// Get rid of `auto` `auto-start` and `auto-end`
var validPlacements = placements.slice(3);

/**
 * Given an initial placement, returns all the subsequent placements
 * clockwise (or counter-clockwise).
 *
 * @method
 * @memberof Popper.Utils
 * @argument {String} placement - A valid placement (it accepts variations)
 * @argument {Boolean} counter - Set to true to walk the placements counterclockwise
 * @returns {Array} placements including their variations
 */
function clockwise(placement) {
  var counter = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

  var index = validPlacements.indexOf(placement);
  var arr = validPlacements.slice(index + 1).concat(validPlacements.slice(0, index));
  return counter ? arr.reverse() : arr;
}

var BEHAVIORS = {
  FLIP: 'flip',
  CLOCKWISE: 'clockwise',
  COUNTERCLOCKWISE: 'counterclockwise'
};

/**
 * @function
 * @memberof Modifiers
 * @argument {Object} data - The data object generated by update method
 * @argument {Object} options - Modifiers configuration and options
 * @returns {Object} The data object, properly modified
 */
function flip(data, options) {
  // if `inner` modifier is enabled, we can't use the `flip` modifier
  if (isModifierEnabled(data.instance.modifiers, 'inner')) {
    return data;
  }

  if (data.flipped && data.placement === data.originalPlacement) {
    // seems like flip is trying to loop, probably there's not enough space on any of the flippable sides
    return data;
  }

  var boundaries = getBoundaries(data.instance.popper, data.instance.reference, options.padding, options.boundariesElement, data.positionFixed);

  var placement = data.placement.split('-')[0];
  var placementOpposite = getOppositePlacement(placement);
  var variation = data.placement.split('-')[1] || '';

  var flipOrder = [];

  switch (options.behavior) {
    case BEHAVIORS.FLIP:
      flipOrder = [placement, placementOpposite];
      break;
    case BEHAVIORS.CLOCKWISE:
      flipOrder = clockwise(placement);
      break;
    case BEHAVIORS.COUNTERCLOCKWISE:
      flipOrder = clockwise(placement, true);
      break;
    default:
      flipOrder = options.behavior;
  }

  flipOrder.forEach(function (step, index) {
    if (placement !== step || flipOrder.length === index + 1) {
      return data;
    }

    placement = data.placement.split('-')[0];
    placementOpposite = getOppositePlacement(placement);

    var popperOffsets = data.offsets.popper;
    var refOffsets = data.offsets.reference;

    // using floor because the reference offsets may contain decimals we are not going to consider here
    var floor = Math.floor;
    var overlapsRef = placement === 'left' && floor(popperOffsets.right) > floor(refOffsets.left) || placement === 'right' && floor(popperOffsets.left) < floor(refOffsets.right) || placement === 'top' && floor(popperOffsets.bottom) > floor(refOffsets.top) || placement === 'bottom' && floor(popperOffsets.top) < floor(refOffsets.bottom);

    var overflowsLeft = floor(popperOffsets.left) < floor(boundaries.left);
    var overflowsRight = floor(popperOffsets.right) > floor(boundaries.right);
    var overflowsTop = floor(popperOffsets.top) < floor(boundaries.top);
    var overflowsBottom = floor(popperOffsets.bottom) > floor(boundaries.bottom);

    var overflowsBoundaries = placement === 'left' && overflowsLeft || placement === 'right' && overflowsRight || placement === 'top' && overflowsTop || placement === 'bottom' && overflowsBottom;

    // flip the variation if required
    var isVertical = ['top', 'bottom'].indexOf(placement) !== -1;
    var flippedVariation = !!options.flipVariations && (isVertical && variation === 'start' && overflowsLeft || isVertical && variation === 'end' && overflowsRight || !isVertical && variation === 'start' && overflowsTop || !isVertical && variation === 'end' && overflowsBottom);

    if (overlapsRef || overflowsBoundaries || flippedVariation) {
      // this boolean to detect any flip loop
      data.flipped = true;

      if (overlapsRef || overflowsBoundaries) {
        placement = flipOrder[index + 1];
      }

      if (flippedVariation) {
        variation = getOppositeVariation(variation);
      }

      data.placement = placement + (variation ? '-' + variation : '');

      // this object contains `position`, we want to preserve it along with
      // any additional property we may add in the future
      data.offsets.popper = _extends({}, data.offsets.popper, getPopperOffsets(data.instance.popper, data.offsets.reference, data.placement));

      data = runModifiers(data.instance.modifiers, data, 'flip');
    }
  });
  return data;
}

/**
 * @function
 * @memberof Modifiers
 * @argument {Object} data - The data object generated by update method
 * @argument {Object} options - Modifiers configuration and options
 * @returns {Object} The data object, properly modified
 */
function keepTogether(data) {
  var _data$offsets = data.offsets,
      popper = _data$offsets.popper,
      reference = _data$offsets.reference;

  var placement = data.placement.split('-')[0];
  var floor = Math.floor;
  var isVertical = ['top', 'bottom'].indexOf(placement) !== -1;
  var side = isVertical ? 'right' : 'bottom';
  var opSide = isVertical ? 'left' : 'top';
  var measurement = isVertical ? 'width' : 'height';

  if (popper[side] < floor(reference[opSide])) {
    data.offsets.popper[opSide] = floor(reference[opSide]) - popper[measurement];
  }
  if (popper[opSide] > floor(reference[side])) {
    data.offsets.popper[opSide] = floor(reference[side]);
  }

  return data;
}

/**
 * Converts a string containing value + unit into a px value number
 * @function
 * @memberof {modifiers~offset}
 * @private
 * @argument {String} str - Value + unit string
 * @argument {String} measurement - `height` or `width`
 * @argument {Object} popperOffsets
 * @argument {Object} referenceOffsets
 * @returns {Number|String}
 * Value in pixels, or original string if no values were extracted
 */
function toValue(str, measurement, popperOffsets, referenceOffsets) {
  // separate value from unit
  var split = str.match(/((?:\-|\+)?\d*\.?\d*)(.*)/);
  var value = +split[1];
  var unit = split[2];

  // If it's not a number it's an operator, I guess
  if (!value) {
    return str;
  }

  if (unit.indexOf('%') === 0) {
    var element = void 0;
    switch (unit) {
      case '%p':
        element = popperOffsets;
        break;
      case '%':
      case '%r':
      default:
        element = referenceOffsets;
    }

    var rect = getClientRect(element);
    return rect[measurement] / 100 * value;
  } else if (unit === 'vh' || unit === 'vw') {
    // if is a vh or vw, we calculate the size based on the viewport
    var size = void 0;
    if (unit === 'vh') {
      size = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
    } else {
      size = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
    }
    return size / 100 * value;
  } else {
    // if is an explicit pixel unit, we get rid of the unit and keep the value
    // if is an implicit unit, it's px, and we return just the value
    return value;
  }
}

/**
 * Parse an `offset` string to extrapolate `x` and `y` numeric offsets.
 * @function
 * @memberof {modifiers~offset}
 * @private
 * @argument {String} offset
 * @argument {Object} popperOffsets
 * @argument {Object} referenceOffsets
 * @argument {String} basePlacement
 * @returns {Array} a two cells array with x and y offsets in numbers
 */
function parseOffset(offset, popperOffsets, referenceOffsets, basePlacement) {
  var offsets = [0, 0];

  // Use height if placement is left or right and index is 0 otherwise use width
  // in this way the first offset will use an axis and the second one
  // will use the other one
  var useHeight = ['right', 'left'].indexOf(basePlacement) !== -1;

  // Split the offset string to obtain a list of values and operands
  // The regex addresses values with the plus or minus sign in front (+10, -20, etc)
  var fragments = offset.split(/(\+|\-)/).map(function (frag) {
    return frag.trim();
  });

  // Detect if the offset string contains a pair of values or a single one
  // they could be separated by comma or space
  var divider = fragments.indexOf(find(fragments, function (frag) {
    return frag.search(/,|\s/) !== -1;
  }));

  if (fragments[divider] && fragments[divider].indexOf(',') === -1) {
    console.warn('Offsets separated by white space(s) are deprecated, use a comma (,) instead.');
  }

  // If divider is found, we divide the list of values and operands to divide
  // them by ofset X and Y.
  var splitRegex = /\s*,\s*|\s+/;
  var ops = divider !== -1 ? [fragments.slice(0, divider).concat([fragments[divider].split(splitRegex)[0]]), [fragments[divider].split(splitRegex)[1]].concat(fragments.slice(divider + 1))] : [fragments];

  // Convert the values with units to absolute pixels to allow our computations
  ops = ops.map(function (op, index) {
    // Most of the units rely on the orientation of the popper
    var measurement = (index === 1 ? !useHeight : useHeight) ? 'height' : 'width';
    var mergeWithPrevious = false;
    return op
    // This aggregates any `+` or `-` sign that aren't considered operators
    // e.g.: 10 + +5 => [10, +, +5]
    .reduce(function (a, b) {
      if (a[a.length - 1] === '' && ['+', '-'].indexOf(b) !== -1) {
        a[a.length - 1] = b;
        mergeWithPrevious = true;
        return a;
      } else if (mergeWithPrevious) {
        a[a.length - 1] += b;
        mergeWithPrevious = false;
        return a;
      } else {
        return a.concat(b);
      }
    }, [])
    // Here we convert the string values into number values (in px)
    .map(function (str) {
      return toValue(str, measurement, popperOffsets, referenceOffsets);
    });
  });

  // Loop trough the offsets arrays and execute the operations
  ops.forEach(function (op, index) {
    op.forEach(function (frag, index2) {
      if (isNumeric(frag)) {
        offsets[index] += frag * (op[index2 - 1] === '-' ? -1 : 1);
      }
    });
  });
  return offsets;
}

/**
 * @function
 * @memberof Modifiers
 * @argument {Object} data - The data object generated by update method
 * @argument {Object} options - Modifiers configuration and options
 * @argument {Number|String} options.offset=0
 * The offset value as described in the modifier description
 * @returns {Object} The data object, properly modified
 */
function offset(data, _ref) {
  var offset = _ref.offset;
  var placement = data.placement,
      _data$offsets = data.offsets,
      popper = _data$offsets.popper,
      reference = _data$offsets.reference;

  var basePlacement = placement.split('-')[0];

  var offsets = void 0;
  if (isNumeric(+offset)) {
    offsets = [+offset, 0];
  } else {
    offsets = parseOffset(offset, popper, reference, basePlacement);
  }

  if (basePlacement === 'left') {
    popper.top += offsets[0];
    popper.left -= offsets[1];
  } else if (basePlacement === 'right') {
    popper.top += offsets[0];
    popper.left += offsets[1];
  } else if (basePlacement === 'top') {
    popper.left += offsets[0];
    popper.top -= offsets[1];
  } else if (basePlacement === 'bottom') {
    popper.left += offsets[0];
    popper.top += offsets[1];
  }

  data.popper = popper;
  return data;
}

/**
 * @function
 * @memberof Modifiers
 * @argument {Object} data - The data object generated by `update` method
 * @argument {Object} options - Modifiers configuration and options
 * @returns {Object} The data object, properly modified
 */
function preventOverflow(data, options) {
  var boundariesElement = options.boundariesElement || getOffsetParent(data.instance.popper);

  // If offsetParent is the reference element, we really want to
  // go one step up and use the next offsetParent as reference to
  // avoid to make this modifier completely useless and look like broken
  if (data.instance.reference === boundariesElement) {
    boundariesElement = getOffsetParent(boundariesElement);
  }

  // NOTE: DOM access here
  // resets the popper's position so that the document size can be calculated excluding
  // the size of the popper element itself
  var transformProp = getSupportedPropertyName('transform');
  var popperStyles = data.instance.popper.style; // assignment to help minification
  var top = popperStyles.top,
      left = popperStyles.left,
      transform = popperStyles[transformProp];

  popperStyles.top = '';
  popperStyles.left = '';
  popperStyles[transformProp] = '';

  var boundaries = getBoundaries(data.instance.popper, data.instance.reference, options.padding, boundariesElement, data.positionFixed);

  // NOTE: DOM access here
  // restores the original style properties after the offsets have been computed
  popperStyles.top = top;
  popperStyles.left = left;
  popperStyles[transformProp] = transform;

  options.boundaries = boundaries;

  var order = options.priority;
  var popper = data.offsets.popper;

  var check = {
    primary: function primary(placement) {
      var value = popper[placement];
      if (popper[placement] < boundaries[placement] && !options.escapeWithReference) {
        value = Math.max(popper[placement], boundaries[placement]);
      }
      return defineProperty({}, placement, value);
    },
    secondary: function secondary(placement) {
      var mainSide = placement === 'right' ? 'left' : 'top';
      var value = popper[mainSide];
      if (popper[placement] > boundaries[placement] && !options.escapeWithReference) {
        value = Math.min(popper[mainSide], boundaries[placement] - (placement === 'right' ? popper.width : popper.height));
      }
      return defineProperty({}, mainSide, value);
    }
  };

  order.forEach(function (placement) {
    var side = ['left', 'top'].indexOf(placement) !== -1 ? 'primary' : 'secondary';
    popper = _extends({}, popper, check[side](placement));
  });

  data.offsets.popper = popper;

  return data;
}

/**
 * @function
 * @memberof Modifiers
 * @argument {Object} data - The data object generated by `update` method
 * @argument {Object} options - Modifiers configuration and options
 * @returns {Object} The data object, properly modified
 */
function shift(data) {
  var placement = data.placement;
  var basePlacement = placement.split('-')[0];
  var shiftvariation = placement.split('-')[1];

  // if shift shiftvariation is specified, run the modifier
  if (shiftvariation) {
    var _data$offsets = data.offsets,
        reference = _data$offsets.reference,
        popper = _data$offsets.popper;

    var isVertical = ['bottom', 'top'].indexOf(basePlacement) !== -1;
    var side = isVertical ? 'left' : 'top';
    var measurement = isVertical ? 'width' : 'height';

    var shiftOffsets = {
      start: defineProperty({}, side, reference[side]),
      end: defineProperty({}, side, reference[side] + reference[measurement] - popper[measurement])
    };

    data.offsets.popper = _extends({}, popper, shiftOffsets[shiftvariation]);
  }

  return data;
}

/**
 * @function
 * @memberof Modifiers
 * @argument {Object} data - The data object generated by update method
 * @argument {Object} options - Modifiers configuration and options
 * @returns {Object} The data object, properly modified
 */
function hide(data) {
  if (!isModifierRequired(data.instance.modifiers, 'hide', 'preventOverflow')) {
    return data;
  }

  var refRect = data.offsets.reference;
  var bound = find(data.instance.modifiers, function (modifier) {
    return modifier.name === 'preventOverflow';
  }).boundaries;

  if (refRect.bottom < bound.top || refRect.left > bound.right || refRect.top > bound.bottom || refRect.right < bound.left) {
    // Avoid unnecessary DOM access if visibility hasn't changed
    if (data.hide === true) {
      return data;
    }

    data.hide = true;
    data.attributes['x-out-of-boundaries'] = '';
  } else {
    // Avoid unnecessary DOM access if visibility hasn't changed
    if (data.hide === false) {
      return data;
    }

    data.hide = false;
    data.attributes['x-out-of-boundaries'] = false;
  }

  return data;
}

/**
 * @function
 * @memberof Modifiers
 * @argument {Object} data - The data object generated by `update` method
 * @argument {Object} options - Modifiers configuration and options
 * @returns {Object} The data object, properly modified
 */
function inner(data) {
  var placement = data.placement;
  var basePlacement = placement.split('-')[0];
  var _data$offsets = data.offsets,
      popper = _data$offsets.popper,
      reference = _data$offsets.reference;

  var isHoriz = ['left', 'right'].indexOf(basePlacement) !== -1;

  var subtractLength = ['top', 'left'].indexOf(basePlacement) === -1;

  popper[isHoriz ? 'left' : 'top'] = reference[basePlacement] - (subtractLength ? popper[isHoriz ? 'width' : 'height'] : 0);

  data.placement = getOppositePlacement(placement);
  data.offsets.popper = getClientRect(popper);

  return data;
}

/**
 * Modifier function, each modifier can have a function of this type assigned
 * to its `fn` property.<br />
 * These functions will be called on each update, this means that you must
 * make sure they are performant enough to avoid performance bottlenecks.
 *
 * @function ModifierFn
 * @argument {dataObject} data - The data object generated by `update` method
 * @argument {Object} options - Modifiers configuration and options
 * @returns {dataObject} The data object, properly modified
 */

/**
 * Modifiers are plugins used to alter the behavior of your poppers.<br />
 * Popper.js uses a set of 9 modifiers to provide all the basic functionalities
 * needed by the library.
 *
 * Usually you don't want to override the `order`, `fn` and `onLoad` props.
 * All the other properties are configurations that could be tweaked.
 * @namespace modifiers
 */
var modifiers = {
  /**
   * Modifier used to shift the popper on the start or end of its reference
   * element.<br />
   * It will read the variation of the `placement` property.<br />
   * It can be one either `-end` or `-start`.
   * @memberof modifiers
   * @inner
   */
  shift: {
    /** @prop {number} order=100 - Index used to define the order of execution */
    order: 100,
    /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
    enabled: true,
    /** @prop {ModifierFn} */
    fn: shift
  },

  /**
   * The `offset` modifier can shift your popper on both its axis.
   *
   * It accepts the following units:
   * - `px` or unit-less, interpreted as pixels
   * - `%` or `%r`, percentage relative to the length of the reference element
   * - `%p`, percentage relative to the length of the popper element
   * - `vw`, CSS viewport width unit
   * - `vh`, CSS viewport height unit
   *
   * For length is intended the main axis relative to the placement of the popper.<br />
   * This means that if the placement is `top` or `bottom`, the length will be the
   * `width`. In case of `left` or `right`, it will be the `height`.
   *
   * You can provide a single value (as `Number` or `String`), or a pair of values
   * as `String` divided by a comma or one (or more) white spaces.<br />
   * The latter is a deprecated method because it leads to confusion and will be
   * removed in v2.<br />
   * Additionally, it accepts additions and subtractions between different units.
   * Note that multiplications and divisions aren't supported.
   *
   * Valid examples are:
   * ```
   * 10
   * '10%'
   * '10, 10'
   * '10%, 10'
   * '10 + 10%'
   * '10 - 5vh + 3%'
   * '-10px + 5vh, 5px - 6%'
   * ```
   * > **NB**: If you desire to apply offsets to your poppers in a way that may make them overlap
   * > with their reference element, unfortunately, you will have to disable the `flip` modifier.
   * > You can read more on this at this [issue](https://github.com/FezVrasta/popper.js/issues/373).
   *
   * @memberof modifiers
   * @inner
   */
  offset: {
    /** @prop {number} order=200 - Index used to define the order of execution */
    order: 200,
    /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
    enabled: true,
    /** @prop {ModifierFn} */
    fn: offset,
    /** @prop {Number|String} offset=0
     * The offset value as described in the modifier description
     */
    offset: 0
  },

  /**
   * Modifier used to prevent the popper from being positioned outside the boundary.
   *
   * A scenario exists where the reference itself is not within the boundaries.<br />
   * We can say it has "escaped the boundaries" — or just "escaped".<br />
   * In this case we need to decide whether the popper should either:
   *
   * - detach from the reference and remain "trapped" in the boundaries, or
   * - if it should ignore the boundary and "escape with its reference"
   *
   * When `escapeWithReference` is set to`true` and reference is completely
   * outside its boundaries, the popper will overflow (or completely leave)
   * the boundaries in order to remain attached to the edge of the reference.
   *
   * @memberof modifiers
   * @inner
   */
  preventOverflow: {
    /** @prop {number} order=300 - Index used to define the order of execution */
    order: 300,
    /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
    enabled: true,
    /** @prop {ModifierFn} */
    fn: preventOverflow,
    /**
     * @prop {Array} [priority=['left','right','top','bottom']]
     * Popper will try to prevent overflow following these priorities by default,
     * then, it could overflow on the left and on top of the `boundariesElement`
     */
    priority: ['left', 'right', 'top', 'bottom'],
    /**
     * @prop {number} padding=5
     * Amount of pixel used to define a minimum distance between the boundaries
     * and the popper. This makes sure the popper always has a little padding
     * between the edges of its container
     */
    padding: 5,
    /**
     * @prop {String|HTMLElement} boundariesElement='scrollParent'
     * Boundaries used by the modifier. Can be `scrollParent`, `window`,
     * `viewport` or any DOM element.
     */
    boundariesElement: 'scrollParent'
  },

  /**
   * Modifier used to make sure the reference and its popper stay near each other
   * without leaving any gap between the two. Especially useful when the arrow is
   * enabled and you want to ensure that it points to its reference element.
   * It cares only about the first axis. You can still have poppers with margin
   * between the popper and its reference element.
   * @memberof modifiers
   * @inner
   */
  keepTogether: {
    /** @prop {number} order=400 - Index used to define the order of execution */
    order: 400,
    /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
    enabled: true,
    /** @prop {ModifierFn} */
    fn: keepTogether
  },

  /**
   * This modifier is used to move the `arrowElement` of the popper to make
   * sure it is positioned between the reference element and its popper element.
   * It will read the outer size of the `arrowElement` node to detect how many
   * pixels of conjunction are needed.
   *
   * It has no effect if no `arrowElement` is provided.
   * @memberof modifiers
   * @inner
   */
  arrow: {
    /** @prop {number} order=500 - Index used to define the order of execution */
    order: 500,
    /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
    enabled: true,
    /** @prop {ModifierFn} */
    fn: arrow,
    /** @prop {String|HTMLElement} element='[x-arrow]' - Selector or node used as arrow */
    element: '[x-arrow]'
  },

  /**
   * Modifier used to flip the popper's placement when it starts to overlap its
   * reference element.
   *
   * Requires the `preventOverflow` modifier before it in order to work.
   *
   * **NOTE:** this modifier will interrupt the current update cycle and will
   * restart it if it detects the need to flip the placement.
   * @memberof modifiers
   * @inner
   */
  flip: {
    /** @prop {number} order=600 - Index used to define the order of execution */
    order: 600,
    /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
    enabled: true,
    /** @prop {ModifierFn} */
    fn: flip,
    /**
     * @prop {String|Array} behavior='flip'
     * The behavior used to change the popper's placement. It can be one of
     * `flip`, `clockwise`, `counterclockwise` or an array with a list of valid
     * placements (with optional variations)
     */
    behavior: 'flip',
    /**
     * @prop {number} padding=5
     * The popper will flip if it hits the edges of the `boundariesElement`
     */
    padding: 5,
    /**
     * @prop {String|HTMLElement} boundariesElement='viewport'
     * The element which will define the boundaries of the popper position.
     * The popper will never be placed outside of the defined boundaries
     * (except if `keepTogether` is enabled)
     */
    boundariesElement: 'viewport'
  },

  /**
   * Modifier used to make the popper flow toward the inner of the reference element.
   * By default, when this modifier is disabled, the popper will be placed outside
   * the reference element.
   * @memberof modifiers
   * @inner
   */
  inner: {
    /** @prop {number} order=700 - Index used to define the order of execution */
    order: 700,
    /** @prop {Boolean} enabled=false - Whether the modifier is enabled or not */
    enabled: false,
    /** @prop {ModifierFn} */
    fn: inner
  },

  /**
   * Modifier used to hide the popper when its reference element is outside of the
   * popper boundaries. It will set a `x-out-of-boundaries` attribute which can
   * be used to hide with a CSS selector the popper when its reference is
   * out of boundaries.
   *
   * Requires the `preventOverflow` modifier before it in order to work.
   * @memberof modifiers
   * @inner
   */
  hide: {
    /** @prop {number} order=800 - Index used to define the order of execution */
    order: 800,
    /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
    enabled: true,
    /** @prop {ModifierFn} */
    fn: hide
  },

  /**
   * Computes the style that will be applied to the popper element to gets
   * properly positioned.
   *
   * Note that this modifier will not touch the DOM, it just prepares the styles
   * so that `applyStyle` modifier can apply it. This separation is useful
   * in case you need to replace `applyStyle` with a custom implementation.
   *
   * This modifier has `850` as `order` value to maintain backward compatibility
   * with previous versions of Popper.js. Expect the modifiers ordering method
   * to change in future major versions of the library.
   *
   * @memberof modifiers
   * @inner
   */
  computeStyle: {
    /** @prop {number} order=850 - Index used to define the order of execution */
    order: 850,
    /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
    enabled: true,
    /** @prop {ModifierFn} */
    fn: computeStyle,
    /**
     * @prop {Boolean} gpuAcceleration=true
     * If true, it uses the CSS 3D transformation to position the popper.
     * Otherwise, it will use the `top` and `left` properties
     */
    gpuAcceleration: true,
    /**
     * @prop {string} [x='bottom']
     * Where to anchor the X axis (`bottom` or `top`). AKA X offset origin.
     * Change this if your popper should grow in a direction different from `bottom`
     */
    x: 'bottom',
    /**
     * @prop {string} [x='left']
     * Where to anchor the Y axis (`left` or `right`). AKA Y offset origin.
     * Change this if your popper should grow in a direction different from `right`
     */
    y: 'right'
  },

  /**
   * Applies the computed styles to the popper element.
   *
   * All the DOM manipulations are limited to this modifier. This is useful in case
   * you want to integrate Popper.js inside a framework or view library and you
   * want to delegate all the DOM manipulations to it.
   *
   * Note that if you disable this modifier, you must make sure the popper element
   * has its position set to `absolute` before Popper.js can do its work!
   *
   * Just disable this modifier and define your own to achieve the desired effect.
   *
   * @memberof modifiers
   * @inner
   */
  applyStyle: {
    /** @prop {number} order=900 - Index used to define the order of execution */
    order: 900,
    /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
    enabled: true,
    /** @prop {ModifierFn} */
    fn: applyStyle,
    /** @prop {Function} */
    onLoad: applyStyleOnLoad,
    /**
     * @deprecated since version 1.10.0, the property moved to `computeStyle` modifier
     * @prop {Boolean} gpuAcceleration=true
     * If true, it uses the CSS 3D transformation to position the popper.
     * Otherwise, it will use the `top` and `left` properties
     */
    gpuAcceleration: undefined
  }
};

/**
 * The `dataObject` is an object containing all the information used by Popper.js.
 * This object is passed to modifiers and to the `onCreate` and `onUpdate` callbacks.
 * @name dataObject
 * @property {Object} data.instance The Popper.js instance
 * @property {String} data.placement Placement applied to popper
 * @property {String} data.originalPlacement Placement originally defined on init
 * @property {Boolean} data.flipped True if popper has been flipped by flip modifier
 * @property {Boolean} data.hide True if the reference element is out of boundaries, useful to know when to hide the popper
 * @property {HTMLElement} data.arrowElement Node used as arrow by arrow modifier
 * @property {Object} data.styles Any CSS property defined here will be applied to the popper. It expects the JavaScript nomenclature (eg. `marginBottom`)
 * @property {Object} data.arrowStyles Any CSS property defined here will be applied to the popper arrow. It expects the JavaScript nomenclature (eg. `marginBottom`)
 * @property {Object} data.boundaries Offsets of the popper boundaries
 * @property {Object} data.offsets The measurements of popper, reference and arrow elements
 * @property {Object} data.offsets.popper `top`, `left`, `width`, `height` values
 * @property {Object} data.offsets.reference `top`, `left`, `width`, `height` values
 * @property {Object} data.offsets.arrow] `top` and `left` offsets, only one of them will be different from 0
 */

/**
 * Default options provided to Popper.js constructor.<br />
 * These can be overridden using the `options` argument of Popper.js.<br />
 * To override an option, simply pass an object with the same
 * structure of the `options` object, as the 3rd argument. For example:
 * ```
 * new Popper(ref, pop, {
 *   modifiers: {
 *     preventOverflow: { enabled: false }
 *   }
 * })
 * ```
 * @type {Object}
 * @static
 * @memberof Popper
 */
var Defaults = {
  /**
   * Popper's placement.
   * @prop {Popper.placements} placement='bottom'
   */
  placement: 'bottom',

  /**
   * Set this to true if you want popper to position it self in 'fixed' mode
   * @prop {Boolean} positionFixed=false
   */
  positionFixed: false,

  /**
   * Whether events (resize, scroll) are initially enabled.
   * @prop {Boolean} eventsEnabled=true
   */
  eventsEnabled: true,

  /**
   * Set to true if you want to automatically remove the popper when
   * you call the `destroy` method.
   * @prop {Boolean} removeOnDestroy=false
   */
  removeOnDestroy: false,

  /**
   * Callback called when the popper is created.<br />
   * By default, it is set to no-op.<br />
   * Access Popper.js instance with `data.instance`.
   * @prop {onCreate}
   */
  onCreate: function onCreate() {},

  /**
   * Callback called when the popper is updated. This callback is not called
   * on the initialization/creation of the popper, but only on subsequent
   * updates.<br />
   * By default, it is set to no-op.<br />
   * Access Popper.js instance with `data.instance`.
   * @prop {onUpdate}
   */
  onUpdate: function onUpdate() {},

  /**
   * List of modifiers used to modify the offsets before they are applied to the popper.
   * They provide most of the functionalities of Popper.js.
   * @prop {modifiers}
   */
  modifiers: modifiers
};

/**
 * @callback onCreate
 * @param {dataObject} data
 */

/**
 * @callback onUpdate
 * @param {dataObject} data
 */

// Utils
// Methods
var Popper = function () {
  /**
   * Creates a new Popper.js instance.
   * @class Popper
   * @param {HTMLElement|referenceObject} reference - The reference element used to position the popper
   * @param {HTMLElement} popper - The HTML element used as the popper
   * @param {Object} options - Your custom options to override the ones defined in [Defaults](#defaults)
   * @return {Object} instance - The generated Popper.js instance
   */
  function Popper(reference, popper) {
    var _this = this;

    var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    classCallCheck(this, Popper);

    this.scheduleUpdate = function () {
      return requestAnimationFrame(_this.update);
    };

    // make update() debounced, so that it only runs at most once-per-tick
    this.update = debounce(this.update.bind(this));

    // with {} we create a new object with the options inside it
    this.options = _extends({}, Popper.Defaults, options);

    // init state
    this.state = {
      isDestroyed: false,
      isCreated: false,
      scrollParents: []
    };

    // get reference and popper elements (allow jQuery wrappers)
    this.reference = reference && reference.jquery ? reference[0] : reference;
    this.popper = popper && popper.jquery ? popper[0] : popper;

    // Deep merge modifiers options
    this.options.modifiers = {};
    Object.keys(_extends({}, Popper.Defaults.modifiers, options.modifiers)).forEach(function (name) {
      _this.options.modifiers[name] = _extends({}, Popper.Defaults.modifiers[name] || {}, options.modifiers ? options.modifiers[name] : {});
    });

    // Refactoring modifiers' list (Object => Array)
    this.modifiers = Object.keys(this.options.modifiers).map(function (name) {
      return _extends({
        name: name
      }, _this.options.modifiers[name]);
    })
    // sort the modifiers by order
    .sort(function (a, b) {
      return a.order - b.order;
    });

    // modifiers have the ability to execute arbitrary code when Popper.js get inited
    // such code is executed in the same order of its modifier
    // they could add new properties to their options configuration
    // BE AWARE: don't add options to `options.modifiers.name` but to `modifierOptions`!
    this.modifiers.forEach(function (modifierOptions) {
      if (modifierOptions.enabled && isFunction(modifierOptions.onLoad)) {
        modifierOptions.onLoad(_this.reference, _this.popper, _this.options, modifierOptions, _this.state);
      }
    });

    // fire the first update to position the popper in the right place
    this.update();

    var eventsEnabled = this.options.eventsEnabled;
    if (eventsEnabled) {
      // setup event listeners, they will take care of update the position in specific situations
      this.enableEventListeners();
    }

    this.state.eventsEnabled = eventsEnabled;
  }

  // We can't use class properties because they don't get listed in the
  // class prototype and break stuff like Sinon stubs


  createClass(Popper, [{
    key: 'update',
    value: function update$$1() {
      return update.call(this);
    }
  }, {
    key: 'destroy',
    value: function destroy$$1() {
      return destroy.call(this);
    }
  }, {
    key: 'enableEventListeners',
    value: function enableEventListeners$$1() {
      return enableEventListeners.call(this);
    }
  }, {
    key: 'disableEventListeners',
    value: function disableEventListeners$$1() {
      return disableEventListeners.call(this);
    }

    /**
     * Schedules an update. It will run on the next UI update available.
     * @method scheduleUpdate
     * @memberof Popper
     */


    /**
     * Collection of utilities useful when writing custom modifiers.
     * Starting from version 1.7, this method is available only if you
     * include `popper-utils.js` before `popper.js`.
     *
     * **DEPRECATION**: This way to access PopperUtils is deprecated
     * and will be removed in v2! Use the PopperUtils module directly instead.
     * Due to the high instability of the methods contained in Utils, we can't
     * guarantee them to follow semver. Use them at your own risk!
     * @static
     * @private
     * @type {Object}
     * @deprecated since version 1.8
     * @member Utils
     * @memberof Popper
     */

  }]);
  return Popper;
}();

/**
 * The `referenceObject` is an object that provides an interface compatible with Popper.js
 * and lets you use it as replacement of a real DOM node.<br />
 * You can use this method to position a popper relatively to a set of coordinates
 * in case you don't have a DOM node to use as reference.
 *
 * ```
 * new Popper(referenceObject, popperNode);
 * ```
 *
 * NB: This feature isn't supported in Internet Explorer 10.
 * @name referenceObject
 * @property {Function} data.getBoundingClientRect
 * A function that returns a set of coordinates compatible with the native `getBoundingClientRect` method.
 * @property {number} data.clientWidth
 * An ES6 getter that will return the width of the virtual reference element.
 * @property {number} data.clientHeight
 * An ES6 getter that will return the height of the virtual reference element.
 */


Popper.Utils = (typeof window !== 'undefined' ? window : global).PopperUtils;
Popper.placements = placements;
Popper.Defaults = Defaults;

return Popper;

})));
/*!
  * Bootstrap v4.1.1 (https://getbootstrap.com/)
  * Copyright 2011-2018 The Bootstrap Authors (https://github.com/twbs/bootstrap/graphs/contributors)
  * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
  */

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('jquery'), require('popper.js')) :
  typeof define === 'function' && define.amd ? define(['exports', 'jquery', 'popper.js'], factory) :
  (factory((global.bootstrap = {}),global.jQuery,global.Popper));
}(this, (function (exports,$,Popper) { 'use strict';

  $ = $ && $.hasOwnProperty('default') ? $['default'] : $;
  Popper = Popper && Popper.hasOwnProperty('default') ? Popper['default'] : Popper;

  function _defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  function _createClass(Constructor, protoProps, staticProps) {
    if (protoProps) _defineProperties(Constructor.prototype, protoProps);
    if (staticProps) _defineProperties(Constructor, staticProps);
    return Constructor;
  }

  function _defineProperty(obj, key, value) {
    if (key in obj) {
      Object.defineProperty(obj, key, {
        value: value,
        enumerable: true,
        configurable: true,
        writable: true
      });
    } else {
      obj[key] = value;
    }

    return obj;
  }

  function _objectSpread(target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i] != null ? arguments[i] : {};
      var ownKeys = Object.keys(source);

      if (typeof Object.getOwnPropertySymbols === 'function') {
        ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) {
          return Object.getOwnPropertyDescriptor(source, sym).enumerable;
        }));
      }

      ownKeys.forEach(function (key) {
        _defineProperty(target, key, source[key]);
      });
    }

    return target;
  }

  function _inheritsLoose(subClass, superClass) {
    subClass.prototype = Object.create(superClass.prototype);
    subClass.prototype.constructor = subClass;
    subClass.__proto__ = superClass;
  }

  /**
   * --------------------------------------------------------------------------
   * Bootstrap (v4.1.1): util.js
   * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
   * --------------------------------------------------------------------------
   */

  var Util = function ($$$1) {
    /**
     * ------------------------------------------------------------------------
     * Private TransitionEnd Helpers
     * ------------------------------------------------------------------------
     */
    var TRANSITION_END = 'transitionend';
    var MAX_UID = 1000000;
    var MILLISECONDS_MULTIPLIER = 1000; // Shoutout AngusCroll (https://goo.gl/pxwQGp)

    function toType(obj) {
      return {}.toString.call(obj).match(/\s([a-z]+)/i)[1].toLowerCase();
    }

    function getSpecialTransitionEndEvent() {
      return {
        bindType: TRANSITION_END,
        delegateType: TRANSITION_END,
        handle: function handle(event) {
          if ($$$1(event.target).is(this)) {
            return event.handleObj.handler.apply(this, arguments); // eslint-disable-line prefer-rest-params
          }

          return undefined; // eslint-disable-line no-undefined
        }
      };
    }

    function transitionEndEmulator(duration) {
      var _this = this;

      var called = false;
      $$$1(this).one(Util.TRANSITION_END, function () {
        called = true;
      });
      setTimeout(function () {
        if (!called) {
          Util.triggerTransitionEnd(_this);
        }
      }, duration);
      return this;
    }

    function setTransitionEndSupport() {
      $$$1.fn.emulateTransitionEnd = transitionEndEmulator;
      $$$1.event.special[Util.TRANSITION_END] = getSpecialTransitionEndEvent();
    }
    /**
     * --------------------------------------------------------------------------
     * Public Util Api
     * --------------------------------------------------------------------------
     */


    var Util = {
      TRANSITION_END: 'bsTransitionEnd',
      getUID: function getUID(prefix) {
        do {
          // eslint-disable-next-line no-bitwise
          prefix += ~~(Math.random() * MAX_UID); // "~~" acts like a faster Math.floor() here
        } while (document.getElementById(prefix));

        return prefix;
      },
      getSelectorFromElement: function getSelectorFromElement(element) {
        var selector = element.getAttribute('data-target');

        if (!selector || selector === '#') {
          selector = element.getAttribute('href') || '';
        }

        try {
          var $selector = $$$1(document).find(selector);
          return $selector.length > 0 ? selector : null;
        } catch (err) {
          return null;
        }
      },
      getTransitionDurationFromElement: function getTransitionDurationFromElement(element) {
        if (!element) {
          return 0;
        } // Get transition-duration of the element


        var transitionDuration = $$$1(element).css('transition-duration');
        var floatTransitionDuration = parseFloat(transitionDuration); // Return 0 if element or transition duration is not found

        if (!floatTransitionDuration) {
          return 0;
        } // If multiple durations are defined, take the first


        transitionDuration = transitionDuration.split(',')[0];
        return parseFloat(transitionDuration) * MILLISECONDS_MULTIPLIER;
      },
      reflow: function reflow(element) {
        return element.offsetHeight;
      },
      triggerTransitionEnd: function triggerTransitionEnd(element) {
        $$$1(element).trigger(TRANSITION_END);
      },
      // TODO: Remove in v5
      supportsTransitionEnd: function supportsTransitionEnd() {
        return Boolean(TRANSITION_END);
      },
      isElement: function isElement(obj) {
        return (obj[0] || obj).nodeType;
      },
      typeCheckConfig: function typeCheckConfig(componentName, config, configTypes) {
        for (var property in configTypes) {
          if (Object.prototype.hasOwnProperty.call(configTypes, property)) {
            var expectedTypes = configTypes[property];
            var value = config[property];
            var valueType = value && Util.isElement(value) ? 'element' : toType(value);

            if (!new RegExp(expectedTypes).test(valueType)) {
              throw new Error(componentName.toUpperCase() + ": " + ("Option \"" + property + "\" provided type \"" + valueType + "\" ") + ("but expected type \"" + expectedTypes + "\"."));
            }
          }
        }
      }
    };
    setTransitionEndSupport();
    return Util;
  }($);

  /**
   * --------------------------------------------------------------------------
   * Bootstrap (v4.1.1): alert.js
   * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
   * --------------------------------------------------------------------------
   */

  var Alert = function ($$$1) {
    /**
     * ------------------------------------------------------------------------
     * Constants
     * ------------------------------------------------------------------------
     */
    var NAME = 'alert';
    var VERSION = '4.1.1';
    var DATA_KEY = 'bs.alert';
    var EVENT_KEY = "." + DATA_KEY;
    var DATA_API_KEY = '.data-api';
    var JQUERY_NO_CONFLICT = $$$1.fn[NAME];
    var Selector = {
      DISMISS: '[data-dismiss="alert"]'
    };
    var Event = {
      CLOSE: "close" + EVENT_KEY,
      CLOSED: "closed" + EVENT_KEY,
      CLICK_DATA_API: "click" + EVENT_KEY + DATA_API_KEY
    };
    var ClassName = {
      ALERT: 'alert',
      FADE: 'fade',
      SHOW: 'show'
      /**
       * ------------------------------------------------------------------------
       * Class Definition
       * ------------------------------------------------------------------------
       */

    };

    var Alert =
    /*#__PURE__*/
    function () {
      function Alert(element) {
        this._element = element;
      } // Getters


      var _proto = Alert.prototype;

      // Public
      _proto.close = function close(element) {
        var rootElement = this._element;

        if (element) {
          rootElement = this._getRootElement(element);
        }

        var customEvent = this._triggerCloseEvent(rootElement);

        if (customEvent.isDefaultPrevented()) {
          return;
        }

        this._removeElement(rootElement);
      };

      _proto.dispose = function dispose() {
        $$$1.removeData(this._element, DATA_KEY);
        this._element = null;
      }; // Private


      _proto._getRootElement = function _getRootElement(element) {
        var selector = Util.getSelectorFromElement(element);
        var parent = false;

        if (selector) {
          parent = $$$1(selector)[0];
        }

        if (!parent) {
          parent = $$$1(element).closest("." + ClassName.ALERT)[0];
        }

        return parent;
      };

      _proto._triggerCloseEvent = function _triggerCloseEvent(element) {
        var closeEvent = $$$1.Event(Event.CLOSE);
        $$$1(element).trigger(closeEvent);
        return closeEvent;
      };

      _proto._removeElement = function _removeElement(element) {
        var _this = this;

        $$$1(element).removeClass(ClassName.SHOW);

        if (!$$$1(element).hasClass(ClassName.FADE)) {
          this._destroyElement(element);

          return;
        }

        var transitionDuration = Util.getTransitionDurationFromElement(element);
        $$$1(element).one(Util.TRANSITION_END, function (event) {
          return _this._destroyElement(element, event);
        }).emulateTransitionEnd(transitionDuration);
      };

      _proto._destroyElement = function _destroyElement(element) {
        $$$1(element).detach().trigger(Event.CLOSED).remove();
      }; // Static


      Alert._jQueryInterface = function _jQueryInterface(config) {
        return this.each(function () {
          var $element = $$$1(this);
          var data = $element.data(DATA_KEY);

          if (!data) {
            data = new Alert(this);
            $element.data(DATA_KEY, data);
          }

          if (config === 'close') {
            data[config](this);
          }
        });
      };

      Alert._handleDismiss = function _handleDismiss(alertInstance) {
        return function (event) {
          if (event) {
            event.preventDefault();
          }

          alertInstance.close(this);
        };
      };

      _createClass(Alert, null, [{
        key: "VERSION",
        get: function get() {
          return VERSION;
        }
      }]);

      return Alert;
    }();
    /**
     * ------------------------------------------------------------------------
     * Data Api implementation
     * ------------------------------------------------------------------------
     */


    $$$1(document).on(Event.CLICK_DATA_API, Selector.DISMISS, Alert._handleDismiss(new Alert()));
    /**
     * ------------------------------------------------------------------------
     * jQuery
     * ------------------------------------------------------------------------
     */

    $$$1.fn[NAME] = Alert._jQueryInterface;
    $$$1.fn[NAME].Constructor = Alert;

    $$$1.fn[NAME].noConflict = function () {
      $$$1.fn[NAME] = JQUERY_NO_CONFLICT;
      return Alert._jQueryInterface;
    };

    return Alert;
  }($);

  /**
   * --------------------------------------------------------------------------
   * Bootstrap (v4.1.1): button.js
   * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
   * --------------------------------------------------------------------------
   */

  var Button = function ($$$1) {
    /**
     * ------------------------------------------------------------------------
     * Constants
     * ------------------------------------------------------------------------
     */
    var NAME = 'button';
    var VERSION = '4.1.1';
    var DATA_KEY = 'bs.button';
    var EVENT_KEY = "." + DATA_KEY;
    var DATA_API_KEY = '.data-api';
    var JQUERY_NO_CONFLICT = $$$1.fn[NAME];
    var ClassName = {
      ACTIVE: 'active',
      BUTTON: 'btn',
      FOCUS: 'focus'
    };
    var Selector = {
      DATA_TOGGLE_CARROT: '[data-toggle^="button"]',
      DATA_TOGGLE: '[data-toggle="buttons"]',
      INPUT: 'input',
      ACTIVE: '.active',
      BUTTON: '.btn'
    };
    var Event = {
      CLICK_DATA_API: "click" + EVENT_KEY + DATA_API_KEY,
      FOCUS_BLUR_DATA_API: "focus" + EVENT_KEY + DATA_API_KEY + " " + ("blur" + EVENT_KEY + DATA_API_KEY)
      /**
       * ------------------------------------------------------------------------
       * Class Definition
       * ------------------------------------------------------------------------
       */

    };

    var Button =
    /*#__PURE__*/
    function () {
      function Button(element) {
        this._element = element;
      } // Getters


      var _proto = Button.prototype;

      // Public
      _proto.toggle = function toggle() {
        var triggerChangeEvent = true;
        var addAriaPressed = true;
        var rootElement = $$$1(this._element).closest(Selector.DATA_TOGGLE)[0];

        if (rootElement) {
          var input = $$$1(this._element).find(Selector.INPUT)[0];

          if (input) {
            if (input.type === 'radio') {
              if (input.checked && $$$1(this._element).hasClass(ClassName.ACTIVE)) {
                triggerChangeEvent = false;
              } else {
                var activeElement = $$$1(rootElement).find(Selector.ACTIVE)[0];

                if (activeElement) {
                  $$$1(activeElement).removeClass(ClassName.ACTIVE);
                }
              }
            }

            if (triggerChangeEvent) {
              if (input.hasAttribute('disabled') || rootElement.hasAttribute('disabled') || input.classList.contains('disabled') || rootElement.classList.contains('disabled')) {
                return;
              }

              input.checked = !$$$1(this._element).hasClass(ClassName.ACTIVE);
              $$$1(input).trigger('change');
            }

            input.focus();
            addAriaPressed = false;
          }
        }

        if (addAriaPressed) {
          this._element.setAttribute('aria-pressed', !$$$1(this._element).hasClass(ClassName.ACTIVE));
        }

        if (triggerChangeEvent) {
          $$$1(this._element).toggleClass(ClassName.ACTIVE);
        }
      };

      _proto.dispose = function dispose() {
        $$$1.removeData(this._element, DATA_KEY);
        this._element = null;
      }; // Static


      Button._jQueryInterface = function _jQueryInterface(config) {
        return this.each(function () {
          var data = $$$1(this).data(DATA_KEY);

          if (!data) {
            data = new Button(this);
            $$$1(this).data(DATA_KEY, data);
          }

          if (config === 'toggle') {
            data[config]();
          }
        });
      };

      _createClass(Button, null, [{
        key: "VERSION",
        get: function get() {
          return VERSION;
        }
      }]);

      return Button;
    }();
    /**
     * ------------------------------------------------------------------------
     * Data Api implementation
     * ------------------------------------------------------------------------
     */


    $$$1(document).on(Event.CLICK_DATA_API, Selector.DATA_TOGGLE_CARROT, function (event) {
      event.preventDefault();
      var button = event.target;

      if (!$$$1(button).hasClass(ClassName.BUTTON)) {
        button = $$$1(button).closest(Selector.BUTTON);
      }

      Button._jQueryInterface.call($$$1(button), 'toggle');
    }).on(Event.FOCUS_BLUR_DATA_API, Selector.DATA_TOGGLE_CARROT, function (event) {
      var button = $$$1(event.target).closest(Selector.BUTTON)[0];
      $$$1(button).toggleClass(ClassName.FOCUS, /^focus(in)?$/.test(event.type));
    });
    /**
     * ------------------------------------------------------------------------
     * jQuery
     * ------------------------------------------------------------------------
     */

    $$$1.fn[NAME] = Button._jQueryInterface;
    $$$1.fn[NAME].Constructor = Button;

    $$$1.fn[NAME].noConflict = function () {
      $$$1.fn[NAME] = JQUERY_NO_CONFLICT;
      return Button._jQueryInterface;
    };

    return Button;
  }($);

  /**
   * --------------------------------------------------------------------------
   * Bootstrap (v4.1.1): carousel.js
   * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
   * --------------------------------------------------------------------------
   */

  var Carousel = function ($$$1) {
    /**
     * ------------------------------------------------------------------------
     * Constants
     * ------------------------------------------------------------------------
     */
    var NAME = 'carousel';
    var VERSION = '4.1.1';
    var DATA_KEY = 'bs.carousel';
    var EVENT_KEY = "." + DATA_KEY;
    var DATA_API_KEY = '.data-api';
    var JQUERY_NO_CONFLICT = $$$1.fn[NAME];
    var ARROW_LEFT_KEYCODE = 37; // KeyboardEvent.which value for left arrow key

    var ARROW_RIGHT_KEYCODE = 39; // KeyboardEvent.which value for right arrow key

    var TOUCHEVENT_COMPAT_WAIT = 500; // Time for mouse compat events to fire after touch

    var Default = {
      interval: 5000,
      keyboard: true,
      slide: false,
      pause: 'hover',
      wrap: true
    };
    var DefaultType = {
      interval: '(number|boolean)',
      keyboard: 'boolean',
      slide: '(boolean|string)',
      pause: '(string|boolean)',
      wrap: 'boolean'
    };
    var Direction = {
      NEXT: 'next',
      PREV: 'prev',
      LEFT: 'left',
      RIGHT: 'right'
    };
    var Event = {
      SLIDE: "slide" + EVENT_KEY,
      SLID: "slid" + EVENT_KEY,
      KEYDOWN: "keydown" + EVENT_KEY,
      MOUSEENTER: "mouseenter" + EVENT_KEY,
      MOUSELEAVE: "mouseleave" + EVENT_KEY,
      TOUCHEND: "touchend" + EVENT_KEY,
      LOAD_DATA_API: "load" + EVENT_KEY + DATA_API_KEY,
      CLICK_DATA_API: "click" + EVENT_KEY + DATA_API_KEY
    };
    var ClassName = {
      CAROUSEL: 'carousel',
      ACTIVE: 'active',
      SLIDE: 'slide',
      RIGHT: 'carousel-item-right',
      LEFT: 'carousel-item-left',
      NEXT: 'carousel-item-next',
      PREV: 'carousel-item-prev',
      ITEM: 'carousel-item'
    };
    var Selector = {
      ACTIVE: '.active',
      ACTIVE_ITEM: '.active.carousel-item',
      ITEM: '.carousel-item',
      NEXT_PREV: '.carousel-item-next, .carousel-item-prev',
      INDICATORS: '.carousel-indicators',
      DATA_SLIDE: '[data-slide], [data-slide-to]',
      DATA_RIDE: '[data-ride="carousel"]'
      /**
       * ------------------------------------------------------------------------
       * Class Definition
       * ------------------------------------------------------------------------
       */

    };

    var Carousel =
    /*#__PURE__*/
    function () {
      function Carousel(element, config) {
        this._items = null;
        this._interval = null;
        this._activeElement = null;
        this._isPaused = false;
        this._isSliding = false;
        this.touchTimeout = null;
        this._config = this._getConfig(config);
        this._element = $$$1(element)[0];
        this._indicatorsElement = $$$1(this._element).find(Selector.INDICATORS)[0];

        this._addEventListeners();
      } // Getters


      var _proto = Carousel.prototype;

      // Public
      _proto.next = function next() {
        if (!this._isSliding) {
          this._slide(Direction.NEXT);
        }
      };

      _proto.nextWhenVisible = function nextWhenVisible() {
        // Don't call next when the page isn't visible
        // or the carousel or its parent isn't visible
        if (!document.hidden && $$$1(this._element).is(':visible') && $$$1(this._element).css('visibility') !== 'hidden') {
          this.next();
        }
      };

      _proto.prev = function prev() {
        if (!this._isSliding) {
          this._slide(Direction.PREV);
        }
      };

      _proto.pause = function pause(event) {
        if (!event) {
          this._isPaused = true;
        }

        if ($$$1(this._element).find(Selector.NEXT_PREV)[0]) {
          Util.triggerTransitionEnd(this._element);
          this.cycle(true);
        }

        clearInterval(this._interval);
        this._interval = null;
      };

      _proto.cycle = function cycle(event) {
        if (!event) {
          this._isPaused = false;
        }

        if (this._interval) {
          clearInterval(this._interval);
          this._interval = null;
        }

        if (this._config.interval && !this._isPaused) {
          this._interval = setInterval((document.visibilityState ? this.nextWhenVisible : this.next).bind(this), this._config.interval);
        }
      };

      _proto.to = function to(index) {
        var _this = this;

        this._activeElement = $$$1(this._element).find(Selector.ACTIVE_ITEM)[0];

        var activeIndex = this._getItemIndex(this._activeElement);

        if (index > this._items.length - 1 || index < 0) {
          return;
        }

        if (this._isSliding) {
          $$$1(this._element).one(Event.SLID, function () {
            return _this.to(index);
          });
          return;
        }

        if (activeIndex === index) {
          this.pause();
          this.cycle();
          return;
        }

        var direction = index > activeIndex ? Direction.NEXT : Direction.PREV;

        this._slide(direction, this._items[index]);
      };

      _proto.dispose = function dispose() {
        $$$1(this._element).off(EVENT_KEY);
        $$$1.removeData(this._element, DATA_KEY);
        this._items = null;
        this._config = null;
        this._element = null;
        this._interval = null;
        this._isPaused = null;
        this._isSliding = null;
        this._activeElement = null;
        this._indicatorsElement = null;
      }; // Private


      _proto._getConfig = function _getConfig(config) {
        config = _objectSpread({}, Default, config);
        Util.typeCheckConfig(NAME, config, DefaultType);
        return config;
      };

      _proto._addEventListeners = function _addEventListeners() {
        var _this2 = this;

        if (this._config.keyboard) {
          $$$1(this._element).on(Event.KEYDOWN, function (event) {
            return _this2._keydown(event);
          });
        }

        if (this._config.pause === 'hover') {
          $$$1(this._element).on(Event.MOUSEENTER, function (event) {
            return _this2.pause(event);
          }).on(Event.MOUSELEAVE, function (event) {
            return _this2.cycle(event);
          });

          if ('ontouchstart' in document.documentElement) {
            // If it's a touch-enabled device, mouseenter/leave are fired as
            // part of the mouse compatibility events on first tap - the carousel
            // would stop cycling until user tapped out of it;
            // here, we listen for touchend, explicitly pause the carousel
            // (as if it's the second time we tap on it, mouseenter compat event
            // is NOT fired) and after a timeout (to allow for mouse compatibility
            // events to fire) we explicitly restart cycling
            $$$1(this._element).on(Event.TOUCHEND, function () {
              _this2.pause();

              if (_this2.touchTimeout) {
                clearTimeout(_this2.touchTimeout);
              }

              _this2.touchTimeout = setTimeout(function (event) {
                return _this2.cycle(event);
              }, TOUCHEVENT_COMPAT_WAIT + _this2._config.interval);
            });
          }
        }
      };

      _proto._keydown = function _keydown(event) {
        if (/input|textarea/i.test(event.target.tagName)) {
          return;
        }

        switch (event.which) {
          case ARROW_LEFT_KEYCODE:
            event.preventDefault();
            this.prev();
            break;

          case ARROW_RIGHT_KEYCODE:
            event.preventDefault();
            this.next();
            break;

          default:
        }
      };

      _proto._getItemIndex = function _getItemIndex(element) {
        this._items = $$$1.makeArray($$$1(element).parent().find(Selector.ITEM));
        return this._items.indexOf(element);
      };

      _proto._getItemByDirection = function _getItemByDirection(direction, activeElement) {
        var isNextDirection = direction === Direction.NEXT;
        var isPrevDirection = direction === Direction.PREV;

        var activeIndex = this._getItemIndex(activeElement);

        var lastItemIndex = this._items.length - 1;
        var isGoingToWrap = isPrevDirection && activeIndex === 0 || isNextDirection && activeIndex === lastItemIndex;

        if (isGoingToWrap && !this._config.wrap) {
          return activeElement;
        }

        var delta = direction === Direction.PREV ? -1 : 1;
        var itemIndex = (activeIndex + delta) % this._items.length;
        return itemIndex === -1 ? this._items[this._items.length - 1] : this._items[itemIndex];
      };

      _proto._triggerSlideEvent = function _triggerSlideEvent(relatedTarget, eventDirectionName) {
        var targetIndex = this._getItemIndex(relatedTarget);

        var fromIndex = this._getItemIndex($$$1(this._element).find(Selector.ACTIVE_ITEM)[0]);

        var slideEvent = $$$1.Event(Event.SLIDE, {
          relatedTarget: relatedTarget,
          direction: eventDirectionName,
          from: fromIndex,
          to: targetIndex
        });
        $$$1(this._element).trigger(slideEvent);
        return slideEvent;
      };

      _proto._setActiveIndicatorElement = function _setActiveIndicatorElement(element) {
        if (this._indicatorsElement) {
          $$$1(this._indicatorsElement).find(Selector.ACTIVE).removeClass(ClassName.ACTIVE);

          var nextIndicator = this._indicatorsElement.children[this._getItemIndex(element)];

          if (nextIndicator) {
            $$$1(nextIndicator).addClass(ClassName.ACTIVE);
          }
        }
      };

      _proto._slide = function _slide(direction, element) {
        var _this3 = this;

        var activeElement = $$$1(this._element).find(Selector.ACTIVE_ITEM)[0];

        var activeElementIndex = this._getItemIndex(activeElement);

        var nextElement = element || activeElement && this._getItemByDirection(direction, activeElement);

        var nextElementIndex = this._getItemIndex(nextElement);

        var isCycling = Boolean(this._interval);
        var directionalClassName;
        var orderClassName;
        var eventDirectionName;

        if (direction === Direction.NEXT) {
          directionalClassName = ClassName.LEFT;
          orderClassName = ClassName.NEXT;
          eventDirectionName = Direction.LEFT;
        } else {
          directionalClassName = ClassName.RIGHT;
          orderClassName = ClassName.PREV;
          eventDirectionName = Direction.RIGHT;
        }

        if (nextElement && $$$1(nextElement).hasClass(ClassName.ACTIVE)) {
          this._isSliding = false;
          return;
        }

        var slideEvent = this._triggerSlideEvent(nextElement, eventDirectionName);

        if (slideEvent.isDefaultPrevented()) {
          return;
        }

        if (!activeElement || !nextElement) {
          // Some weirdness is happening, so we bail
          return;
        }

        this._isSliding = true;

        if (isCycling) {
          this.pause();
        }

        this._setActiveIndicatorElement(nextElement);

        var slidEvent = $$$1.Event(Event.SLID, {
          relatedTarget: nextElement,
          direction: eventDirectionName,
          from: activeElementIndex,
          to: nextElementIndex
        });

        if ($$$1(this._element).hasClass(ClassName.SLIDE)) {
          $$$1(nextElement).addClass(orderClassName);
          Util.reflow(nextElement);
          $$$1(activeElement).addClass(directionalClassName);
          $$$1(nextElement).addClass(directionalClassName);
          var transitionDuration = Util.getTransitionDurationFromElement(activeElement);
          $$$1(activeElement).one(Util.TRANSITION_END, function () {
            $$$1(nextElement).removeClass(directionalClassName + " " + orderClassName).addClass(ClassName.ACTIVE);
            $$$1(activeElement).removeClass(ClassName.ACTIVE + " " + orderClassName + " " + directionalClassName);
            _this3._isSliding = false;
            setTimeout(function () {
              return $$$1(_this3._element).trigger(slidEvent);
            }, 0);
          }).emulateTransitionEnd(transitionDuration);
        } else {
          $$$1(activeElement).removeClass(ClassName.ACTIVE);
          $$$1(nextElement).addClass(ClassName.ACTIVE);
          this._isSliding = false;
          $$$1(this._element).trigger(slidEvent);
        }

        if (isCycling) {
          this.cycle();
        }
      }; // Static


      Carousel._jQueryInterface = function _jQueryInterface(config) {
        return this.each(function () {
          var data = $$$1(this).data(DATA_KEY);

          var _config = _objectSpread({}, Default, $$$1(this).data());

          if (typeof config === 'object') {
            _config = _objectSpread({}, _config, config);
          }

          var action = typeof config === 'string' ? config : _config.slide;

          if (!data) {
            data = new Carousel(this, _config);
            $$$1(this).data(DATA_KEY, data);
          }

          if (typeof config === 'number') {
            data.to(config);
          } else if (typeof action === 'string') {
            if (typeof data[action] === 'undefined') {
              throw new TypeError("No method named \"" + action + "\"");
            }

            data[action]();
          } else if (_config.interval) {
            data.pause();
            data.cycle();
          }
        });
      };

      Carousel._dataApiClickHandler = function _dataApiClickHandler(event) {
        var selector = Util.getSelectorFromElement(this);

        if (!selector) {
          return;
        }

        var target = $$$1(selector)[0];

        if (!target || !$$$1(target).hasClass(ClassName.CAROUSEL)) {
          return;
        }

        var config = _objectSpread({}, $$$1(target).data(), $$$1(this).data());

        var slideIndex = this.getAttribute('data-slide-to');

        if (slideIndex) {
          config.interval = false;
        }

        Carousel._jQueryInterface.call($$$1(target), config);

        if (slideIndex) {
          $$$1(target).data(DATA_KEY).to(slideIndex);
        }

        event.preventDefault();
      };

      _createClass(Carousel, null, [{
        key: "VERSION",
        get: function get() {
          return VERSION;
        }
      }, {
        key: "Default",
        get: function get() {
          return Default;
        }
      }]);

      return Carousel;
    }();
    /**
     * ------------------------------------------------------------------------
     * Data Api implementation
     * ------------------------------------------------------------------------
     */


    $$$1(document).on(Event.CLICK_DATA_API, Selector.DATA_SLIDE, Carousel._dataApiClickHandler);
    $$$1(window).on(Event.LOAD_DATA_API, function () {
      $$$1(Selector.DATA_RIDE).each(function () {
        var $carousel = $$$1(this);

        Carousel._jQueryInterface.call($carousel, $carousel.data());
      });
    });
    /**
     * ------------------------------------------------------------------------
     * jQuery
     * ------------------------------------------------------------------------
     */

    $$$1.fn[NAME] = Carousel._jQueryInterface;
    $$$1.fn[NAME].Constructor = Carousel;

    $$$1.fn[NAME].noConflict = function () {
      $$$1.fn[NAME] = JQUERY_NO_CONFLICT;
      return Carousel._jQueryInterface;
    };

    return Carousel;
  }($);

  /**
   * --------------------------------------------------------------------------
   * Bootstrap (v4.1.1): collapse.js
   * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
   * --------------------------------------------------------------------------
   */

  var Collapse = function ($$$1) {
    /**
     * ------------------------------------------------------------------------
     * Constants
     * ------------------------------------------------------------------------
     */
    var NAME = 'collapse';
    var VERSION = '4.1.1';
    var DATA_KEY = 'bs.collapse';
    var EVENT_KEY = "." + DATA_KEY;
    var DATA_API_KEY = '.data-api';
    var JQUERY_NO_CONFLICT = $$$1.fn[NAME];
    var Default = {
      toggle: true,
      parent: ''
    };
    var DefaultType = {
      toggle: 'boolean',
      parent: '(string|element)'
    };
    var Event = {
      SHOW: "show" + EVENT_KEY,
      SHOWN: "shown" + EVENT_KEY,
      HIDE: "hide" + EVENT_KEY,
      HIDDEN: "hidden" + EVENT_KEY,
      CLICK_DATA_API: "click" + EVENT_KEY + DATA_API_KEY
    };
    var ClassName = {
      SHOW: 'show',
      COLLAPSE: 'collapse',
      COLLAPSING: 'collapsing',
      COLLAPSED: 'collapsed'
    };
    var Dimension = {
      WIDTH: 'width',
      HEIGHT: 'height'
    };
    var Selector = {
      ACTIVES: '.show, .collapsing',
      DATA_TOGGLE: '[data-toggle="collapse"]'
      /**
       * ------------------------------------------------------------------------
       * Class Definition
       * ------------------------------------------------------------------------
       */

    };

    var Collapse =
    /*#__PURE__*/
    function () {
      function Collapse(element, config) {
        this._isTransitioning = false;
        this._element = element;
        this._config = this._getConfig(config);
        this._triggerArray = $$$1.makeArray($$$1("[data-toggle=\"collapse\"][href=\"#" + element.id + "\"]," + ("[data-toggle=\"collapse\"][data-target=\"#" + element.id + "\"]")));
        var tabToggles = $$$1(Selector.DATA_TOGGLE);

        for (var i = 0; i < tabToggles.length; i++) {
          var elem = tabToggles[i];
          var selector = Util.getSelectorFromElement(elem);

          if (selector !== null && $$$1(selector).filter(element).length > 0) {
            this._selector = selector;

            this._triggerArray.push(elem);
          }
        }

        this._parent = this._config.parent ? this._getParent() : null;

        if (!this._config.parent) {
          this._addAriaAndCollapsedClass(this._element, this._triggerArray);
        }

        if (this._config.toggle) {
          this.toggle();
        }
      } // Getters


      var _proto = Collapse.prototype;

      // Public
      _proto.toggle = function toggle() {
        if ($$$1(this._element).hasClass(ClassName.SHOW)) {
          this.hide();
        } else {
          this.show();
        }
      };

      _proto.show = function show() {
        var _this = this;

        if (this._isTransitioning || $$$1(this._element).hasClass(ClassName.SHOW)) {
          return;
        }

        var actives;
        var activesData;

        if (this._parent) {
          actives = $$$1.makeArray($$$1(this._parent).find(Selector.ACTIVES).filter("[data-parent=\"" + this._config.parent + "\"]"));

          if (actives.length === 0) {
            actives = null;
          }
        }

        if (actives) {
          activesData = $$$1(actives).not(this._selector).data(DATA_KEY);

          if (activesData && activesData._isTransitioning) {
            return;
          }
        }

        var startEvent = $$$1.Event(Event.SHOW);
        $$$1(this._element).trigger(startEvent);

        if (startEvent.isDefaultPrevented()) {
          return;
        }

        if (actives) {
          Collapse._jQueryInterface.call($$$1(actives).not(this._selector), 'hide');

          if (!activesData) {
            $$$1(actives).data(DATA_KEY, null);
          }
        }

        var dimension = this._getDimension();

        $$$1(this._element).removeClass(ClassName.COLLAPSE).addClass(ClassName.COLLAPSING);
        this._element.style[dimension] = 0;

        if (this._triggerArray.length > 0) {
          $$$1(this._triggerArray).removeClass(ClassName.COLLAPSED).attr('aria-expanded', true);
        }

        this.setTransitioning(true);

        var complete = function complete() {
          $$$1(_this._element).removeClass(ClassName.COLLAPSING).addClass(ClassName.COLLAPSE).addClass(ClassName.SHOW);
          _this._element.style[dimension] = '';

          _this.setTransitioning(false);

          $$$1(_this._element).trigger(Event.SHOWN);
        };

        var capitalizedDimension = dimension[0].toUpperCase() + dimension.slice(1);
        var scrollSize = "scroll" + capitalizedDimension;
        var transitionDuration = Util.getTransitionDurationFromElement(this._element);
        $$$1(this._element).one(Util.TRANSITION_END, complete).emulateTransitionEnd(transitionDuration);
        this._element.style[dimension] = this._element[scrollSize] + "px";
      };

      _proto.hide = function hide() {
        var _this2 = this;

        if (this._isTransitioning || !$$$1(this._element).hasClass(ClassName.SHOW)) {
          return;
        }

        var startEvent = $$$1.Event(Event.HIDE);
        $$$1(this._element).trigger(startEvent);

        if (startEvent.isDefaultPrevented()) {
          return;
        }

        var dimension = this._getDimension();

        this._element.style[dimension] = this._element.getBoundingClientRect()[dimension] + "px";
        Util.reflow(this._element);
        $$$1(this._element).addClass(ClassName.COLLAPSING).removeClass(ClassName.COLLAPSE).removeClass(ClassName.SHOW);

        if (this._triggerArray.length > 0) {
          for (var i = 0; i < this._triggerArray.length; i++) {
            var trigger = this._triggerArray[i];
            var selector = Util.getSelectorFromElement(trigger);

            if (selector !== null) {
              var $elem = $$$1(selector);

              if (!$elem.hasClass(ClassName.SHOW)) {
                $$$1(trigger).addClass(ClassName.COLLAPSED).attr('aria-expanded', false);
              }
            }
          }
        }

        this.setTransitioning(true);

        var complete = function complete() {
          _this2.setTransitioning(false);

          $$$1(_this2._element).removeClass(ClassName.COLLAPSING).addClass(ClassName.COLLAPSE).trigger(Event.HIDDEN);
        };

        this._element.style[dimension] = '';
        var transitionDuration = Util.getTransitionDurationFromElement(this._element);
        $$$1(this._element).one(Util.TRANSITION_END, complete).emulateTransitionEnd(transitionDuration);
      };

      _proto.setTransitioning = function setTransitioning(isTransitioning) {
        this._isTransitioning = isTransitioning;
      };

      _proto.dispose = function dispose() {
        $$$1.removeData(this._element, DATA_KEY);
        this._config = null;
        this._parent = null;
        this._element = null;
        this._triggerArray = null;
        this._isTransitioning = null;
      }; // Private


      _proto._getConfig = function _getConfig(config) {
        config = _objectSpread({}, Default, config);
        config.toggle = Boolean(config.toggle); // Coerce string values

        Util.typeCheckConfig(NAME, config, DefaultType);
        return config;
      };

      _proto._getDimension = function _getDimension() {
        var hasWidth = $$$1(this._element).hasClass(Dimension.WIDTH);
        return hasWidth ? Dimension.WIDTH : Dimension.HEIGHT;
      };

      _proto._getParent = function _getParent() {
        var _this3 = this;

        var parent = null;

        if (Util.isElement(this._config.parent)) {
          parent = this._config.parent; // It's a jQuery object

          if (typeof this._config.parent.jquery !== 'undefined') {
            parent = this._config.parent[0];
          }
        } else {
          parent = $$$1(this._config.parent)[0];
        }

        var selector = "[data-toggle=\"collapse\"][data-parent=\"" + this._config.parent + "\"]";
        $$$1(parent).find(selector).each(function (i, element) {
          _this3._addAriaAndCollapsedClass(Collapse._getTargetFromElement(element), [element]);
        });
        return parent;
      };

      _proto._addAriaAndCollapsedClass = function _addAriaAndCollapsedClass(element, triggerArray) {
        if (element) {
          var isOpen = $$$1(element).hasClass(ClassName.SHOW);

          if (triggerArray.length > 0) {
            $$$1(triggerArray).toggleClass(ClassName.COLLAPSED, !isOpen).attr('aria-expanded', isOpen);
          }
        }
      }; // Static


      Collapse._getTargetFromElement = function _getTargetFromElement(element) {
        var selector = Util.getSelectorFromElement(element);
        return selector ? $$$1(selector)[0] : null;
      };

      Collapse._jQueryInterface = function _jQueryInterface(config) {
        return this.each(function () {
          var $this = $$$1(this);
          var data = $this.data(DATA_KEY);

          var _config = _objectSpread({}, Default, $this.data(), typeof config === 'object' && config ? config : {});

          if (!data && _config.toggle && /show|hide/.test(config)) {
            _config.toggle = false;
          }

          if (!data) {
            data = new Collapse(this, _config);
            $this.data(DATA_KEY, data);
          }

          if (typeof config === 'string') {
            if (typeof data[config] === 'undefined') {
              throw new TypeError("No method named \"" + config + "\"");
            }

            data[config]();
          }
        });
      };

      _createClass(Collapse, null, [{
        key: "VERSION",
        get: function get() {
          return VERSION;
        }
      }, {
        key: "Default",
        get: function get() {
          return Default;
        }
      }]);

      return Collapse;
    }();
    /**
     * ------------------------------------------------------------------------
     * Data Api implementation
     * ------------------------------------------------------------------------
     */


    $$$1(document).on(Event.CLICK_DATA_API, Selector.DATA_TOGGLE, function (event) {
      // preventDefault only for <a> elements (which change the URL) not inside the collapsible element
      if (event.currentTarget.tagName === 'A') {
        event.preventDefault();
      }

      var $trigger = $$$1(this);
      var selector = Util.getSelectorFromElement(this);
      $$$1(selector).each(function () {
        var $target = $$$1(this);
        var data = $target.data(DATA_KEY);
        var config = data ? 'toggle' : $trigger.data();

        Collapse._jQueryInterface.call($target, config);
      });
    });
    /**
     * ------------------------------------------------------------------------
     * jQuery
     * ------------------------------------------------------------------------
     */

    $$$1.fn[NAME] = Collapse._jQueryInterface;
    $$$1.fn[NAME].Constructor = Collapse;

    $$$1.fn[NAME].noConflict = function () {
      $$$1.fn[NAME] = JQUERY_NO_CONFLICT;
      return Collapse._jQueryInterface;
    };

    return Collapse;
  }($);

  /**
   * --------------------------------------------------------------------------
   * Bootstrap (v4.1.1): dropdown.js
   * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
   * --------------------------------------------------------------------------
   */

  var Dropdown = function ($$$1) {
    /**
     * ------------------------------------------------------------------------
     * Constants
     * ------------------------------------------------------------------------
     */
    var NAME = 'dropdown';
    var VERSION = '4.1.1';
    var DATA_KEY = 'bs.dropdown';
    var EVENT_KEY = "." + DATA_KEY;
    var DATA_API_KEY = '.data-api';
    var JQUERY_NO_CONFLICT = $$$1.fn[NAME];
    var ESCAPE_KEYCODE = 27; // KeyboardEvent.which value for Escape (Esc) key

    var SPACE_KEYCODE = 32; // KeyboardEvent.which value for space key

    var TAB_KEYCODE = 9; // KeyboardEvent.which value for tab key

    var ARROW_UP_KEYCODE = 38; // KeyboardEvent.which value for up arrow key

    var ARROW_DOWN_KEYCODE = 40; // KeyboardEvent.which value for down arrow key

    var RIGHT_MOUSE_BUTTON_WHICH = 3; // MouseEvent.which value for the right button (assuming a right-handed mouse)

    var REGEXP_KEYDOWN = new RegExp(ARROW_UP_KEYCODE + "|" + ARROW_DOWN_KEYCODE + "|" + ESCAPE_KEYCODE);
    var Event = {
      HIDE: "hide" + EVENT_KEY,
      HIDDEN: "hidden" + EVENT_KEY,
      SHOW: "show" + EVENT_KEY,
      SHOWN: "shown" + EVENT_KEY,
      CLICK: "click" + EVENT_KEY,
      CLICK_DATA_API: "click" + EVENT_KEY + DATA_API_KEY,
      KEYDOWN_DATA_API: "keydown" + EVENT_KEY + DATA_API_KEY,
      KEYUP_DATA_API: "keyup" + EVENT_KEY + DATA_API_KEY
    };
    var ClassName = {
      DISABLED: 'disabled',
      SHOW: 'show',
      DROPUP: 'dropup',
      DROPRIGHT: 'dropright',
      DROPLEFT: 'dropleft',
      MENURIGHT: 'dropdown-menu-right',
      MENULEFT: 'dropdown-menu-left',
      POSITION_STATIC: 'position-static'
    };
    var Selector = {
      DATA_TOGGLE: '[data-toggle="dropdown"]',
      FORM_CHILD: '.dropdown form',
      MENU: '.dropdown-menu',
      NAVBAR_NAV: '.navbar-nav',
      VISIBLE_ITEMS: '.dropdown-menu .dropdown-item:not(.disabled):not(:disabled)'
    };
    var AttachmentMap = {
      TOP: 'top-start',
      TOPEND: 'top-end',
      BOTTOM: 'bottom-start',
      BOTTOMEND: 'bottom-end',
      RIGHT: 'right-start',
      RIGHTEND: 'right-end',
      LEFT: 'left-start',
      LEFTEND: 'left-end'
    };
    var Default = {
      offset: 0,
      flip: true,
      boundary: 'scrollParent',
      reference: 'toggle',
      display: 'dynamic'
    };
    var DefaultType = {
      offset: '(number|string|function)',
      flip: 'boolean',
      boundary: '(string|element)',
      reference: '(string|element)',
      display: 'string'
      /**
       * ------------------------------------------------------------------------
       * Class Definition
       * ------------------------------------------------------------------------
       */

    };

    var Dropdown =
    /*#__PURE__*/
    function () {
      function Dropdown(element, config) {
        this._element = element;
        this._popper = null;
        this._config = this._getConfig(config);
        this._menu = this._getMenuElement();
        this._inNavbar = this._detectNavbar();

        this._addEventListeners();
      } // Getters


      var _proto = Dropdown.prototype;

      // Public
      _proto.toggle = function toggle() {
        if (this._element.disabled || $$$1(this._element).hasClass(ClassName.DISABLED)) {
          return;
        }

        var parent = Dropdown._getParentFromElement(this._element);

        var isActive = $$$1(this._menu).hasClass(ClassName.SHOW);

        Dropdown._clearMenus();

        if (isActive) {
          return;
        }

        var relatedTarget = {
          relatedTarget: this._element
        };
        var showEvent = $$$1.Event(Event.SHOW, relatedTarget);
        $$$1(parent).trigger(showEvent);

        if (showEvent.isDefaultPrevented()) {
          return;
        } // Disable totally Popper.js for Dropdown in Navbar


        if (!this._inNavbar) {
          /**
           * Check for Popper dependency
           * Popper - https://popper.js.org
           */
          if (typeof Popper === 'undefined') {
            throw new TypeError('Bootstrap dropdown require Popper.js (https://popper.js.org)');
          }

          var referenceElement = this._element;

          if (this._config.reference === 'parent') {
            referenceElement = parent;
          } else if (Util.isElement(this._config.reference)) {
            referenceElement = this._config.reference; // Check if it's jQuery element

            if (typeof this._config.reference.jquery !== 'undefined') {
              referenceElement = this._config.reference[0];
            }
          } // If boundary is not `scrollParent`, then set position to `static`
          // to allow the menu to "escape" the scroll parent's boundaries
          // https://github.com/twbs/bootstrap/issues/24251


          if (this._config.boundary !== 'scrollParent') {
            $$$1(parent).addClass(ClassName.POSITION_STATIC);
          }

          this._popper = new Popper(referenceElement, this._menu, this._getPopperConfig());
        } // If this is a touch-enabled device we add extra
        // empty mouseover listeners to the body's immediate children;
        // only needed because of broken event delegation on iOS
        // https://www.quirksmode.org/blog/archives/2014/02/mouse_event_bub.html


        if ('ontouchstart' in document.documentElement && $$$1(parent).closest(Selector.NAVBAR_NAV).length === 0) {
          $$$1(document.body).children().on('mouseover', null, $$$1.noop);
        }

        this._element.focus();

        this._element.setAttribute('aria-expanded', true);

        $$$1(this._menu).toggleClass(ClassName.SHOW);
        $$$1(parent).toggleClass(ClassName.SHOW).trigger($$$1.Event(Event.SHOWN, relatedTarget));
      };

      _proto.dispose = function dispose() {
        $$$1.removeData(this._element, DATA_KEY);
        $$$1(this._element).off(EVENT_KEY);
        this._element = null;
        this._menu = null;

        if (this._popper !== null) {
          this._popper.destroy();

          this._popper = null;
        }
      };

      _proto.update = function update() {
        this._inNavbar = this._detectNavbar();

        if (this._popper !== null) {
          this._popper.scheduleUpdate();
        }
      }; // Private


      _proto._addEventListeners = function _addEventListeners() {
        var _this = this;

        $$$1(this._element).on(Event.CLICK, function (event) {
          event.preventDefault();
          event.stopPropagation();

          _this.toggle();
        });
      };

      _proto._getConfig = function _getConfig(config) {
        config = _objectSpread({}, this.constructor.Default, $$$1(this._element).data(), config);
        Util.typeCheckConfig(NAME, config, this.constructor.DefaultType);
        return config;
      };

      _proto._getMenuElement = function _getMenuElement() {
        if (!this._menu) {
          var parent = Dropdown._getParentFromElement(this._element);

          this._menu = $$$1(parent).find(Selector.MENU)[0];
        }

        return this._menu;
      };

      _proto._getPlacement = function _getPlacement() {
        var $parentDropdown = $$$1(this._element).parent();
        var placement = AttachmentMap.BOTTOM; // Handle dropup

        if ($parentDropdown.hasClass(ClassName.DROPUP)) {
          placement = AttachmentMap.TOP;

          if ($$$1(this._menu).hasClass(ClassName.MENURIGHT)) {
            placement = AttachmentMap.TOPEND;
          }
        } else if ($parentDropdown.hasClass(ClassName.DROPRIGHT)) {
          placement = AttachmentMap.RIGHT;
        } else if ($parentDropdown.hasClass(ClassName.DROPLEFT)) {
          placement = AttachmentMap.LEFT;
        } else if ($$$1(this._menu).hasClass(ClassName.MENURIGHT)) {
          placement = AttachmentMap.BOTTOMEND;
        }

        return placement;
      };

      _proto._detectNavbar = function _detectNavbar() {
        return $$$1(this._element).closest('.navbar').length > 0;
      };

      _proto._getPopperConfig = function _getPopperConfig() {
        var _this2 = this;

        var offsetConf = {};

        if (typeof this._config.offset === 'function') {
          offsetConf.fn = function (data) {
            data.offsets = _objectSpread({}, data.offsets, _this2._config.offset(data.offsets) || {});
            return data;
          };
        } else {
          offsetConf.offset = this._config.offset;
        }

        var popperConfig = {
          placement: this._getPlacement(),
          modifiers: {
            offset: offsetConf,
            flip: {
              enabled: this._config.flip
            },
            preventOverflow: {
              boundariesElement: this._config.boundary
            }
          } // Disable Popper.js if we have a static display

        };

        if (this._config.display === 'static') {
          popperConfig.modifiers.applyStyle = {
            enabled: false
          };
        }

        return popperConfig;
      }; // Static


      Dropdown._jQueryInterface = function _jQueryInterface(config) {
        return this.each(function () {
          var data = $$$1(this).data(DATA_KEY);

          var _config = typeof config === 'object' ? config : null;

          if (!data) {
            data = new Dropdown(this, _config);
            $$$1(this).data(DATA_KEY, data);
          }

          if (typeof config === 'string') {
            if (typeof data[config] === 'undefined') {
              throw new TypeError("No method named \"" + config + "\"");
            }

            data[config]();
          }
        });
      };

      Dropdown._clearMenus = function _clearMenus(event) {
        if (event && (event.which === RIGHT_MOUSE_BUTTON_WHICH || event.type === 'keyup' && event.which !== TAB_KEYCODE)) {
          return;
        }

        var toggles = $$$1.makeArray($$$1(Selector.DATA_TOGGLE));

        for (var i = 0; i < toggles.length; i++) {
          var parent = Dropdown._getParentFromElement(toggles[i]);

          var context = $$$1(toggles[i]).data(DATA_KEY);
          var relatedTarget = {
            relatedTarget: toggles[i]
          };

          if (!context) {
            continue;
          }

          var dropdownMenu = context._menu;

          if (!$$$1(parent).hasClass(ClassName.SHOW)) {
            continue;
          }

          if (event && (event.type === 'click' && /input|textarea/i.test(event.target.tagName) || event.type === 'keyup' && event.which === TAB_KEYCODE) && $$$1.contains(parent, event.target)) {
            continue;
          }

          var hideEvent = $$$1.Event(Event.HIDE, relatedTarget);
          $$$1(parent).trigger(hideEvent);

          if (hideEvent.isDefaultPrevented()) {
            continue;
          } // If this is a touch-enabled device we remove the extra
          // empty mouseover listeners we added for iOS support


          if ('ontouchstart' in document.documentElement) {
            $$$1(document.body).children().off('mouseover', null, $$$1.noop);
          }

          toggles[i].setAttribute('aria-expanded', 'false');
          $$$1(dropdownMenu).removeClass(ClassName.SHOW);
          $$$1(parent).removeClass(ClassName.SHOW).trigger($$$1.Event(Event.HIDDEN, relatedTarget));
        }
      };

      Dropdown._getParentFromElement = function _getParentFromElement(element) {
        var parent;
        var selector = Util.getSelectorFromElement(element);

        if (selector) {
          parent = $$$1(selector)[0];
        }

        return parent || element.parentNode;
      }; // eslint-disable-next-line complexity


      Dropdown._dataApiKeydownHandler = function _dataApiKeydownHandler(event) {
        // If not input/textarea:
        //  - And not a key in REGEXP_KEYDOWN => not a dropdown command
        // If input/textarea:
        //  - If space key => not a dropdown command
        //  - If key is other than escape
        //    - If key is not up or down => not a dropdown command
        //    - If trigger inside the menu => not a dropdown command
        if (/input|textarea/i.test(event.target.tagName) ? event.which === SPACE_KEYCODE || event.which !== ESCAPE_KEYCODE && (event.which !== ARROW_DOWN_KEYCODE && event.which !== ARROW_UP_KEYCODE || $$$1(event.target).closest(Selector.MENU).length) : !REGEXP_KEYDOWN.test(event.which)) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();

        if (this.disabled || $$$1(this).hasClass(ClassName.DISABLED)) {
          return;
        }

        var parent = Dropdown._getParentFromElement(this);

        var isActive = $$$1(parent).hasClass(ClassName.SHOW);

        if (!isActive && (event.which !== ESCAPE_KEYCODE || event.which !== SPACE_KEYCODE) || isActive && (event.which === ESCAPE_KEYCODE || event.which === SPACE_KEYCODE)) {
          if (event.which === ESCAPE_KEYCODE) {
            var toggle = $$$1(parent).find(Selector.DATA_TOGGLE)[0];
            $$$1(toggle).trigger('focus');
          }

          $$$1(this).trigger('click');
          return;
        }

        var items = $$$1(parent).find(Selector.VISIBLE_ITEMS).get();

        if (items.length === 0) {
          return;
        }

        var index = items.indexOf(event.target);

        if (event.which === ARROW_UP_KEYCODE && index > 0) {
          // Up
          index--;
        }

        if (event.which === ARROW_DOWN_KEYCODE && index < items.length - 1) {
          // Down
          index++;
        }

        if (index < 0) {
          index = 0;
        }

        items[index].focus();
      };

      _createClass(Dropdown, null, [{
        key: "VERSION",
        get: function get() {
          return VERSION;
        }
      }, {
        key: "Default",
        get: function get() {
          return Default;
        }
      }, {
        key: "DefaultType",
        get: function get() {
          return DefaultType;
        }
      }]);

      return Dropdown;
    }();
    /**
     * ------------------------------------------------------------------------
     * Data Api implementation
     * ------------------------------------------------------------------------
     */


    $$$1(document).on(Event.KEYDOWN_DATA_API, Selector.DATA_TOGGLE, Dropdown._dataApiKeydownHandler).on(Event.KEYDOWN_DATA_API, Selector.MENU, Dropdown._dataApiKeydownHandler).on(Event.CLICK_DATA_API + " " + Event.KEYUP_DATA_API, Dropdown._clearMenus).on(Event.CLICK_DATA_API, Selector.DATA_TOGGLE, function (event) {
      event.preventDefault();
      event.stopPropagation();

      Dropdown._jQueryInterface.call($$$1(this), 'toggle');
    }).on(Event.CLICK_DATA_API, Selector.FORM_CHILD, function (e) {
      e.stopPropagation();
    });
    /**
     * ------------------------------------------------------------------------
     * jQuery
     * ------------------------------------------------------------------------
     */

    $$$1.fn[NAME] = Dropdown._jQueryInterface;
    $$$1.fn[NAME].Constructor = Dropdown;

    $$$1.fn[NAME].noConflict = function () {
      $$$1.fn[NAME] = JQUERY_NO_CONFLICT;
      return Dropdown._jQueryInterface;
    };

    return Dropdown;
  }($, Popper);

  /**
   * --------------------------------------------------------------------------
   * Bootstrap (v4.1.1): modal.js
   * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
   * --------------------------------------------------------------------------
   */

  var Modal = function ($$$1) {
    /**
     * ------------------------------------------------------------------------
     * Constants
     * ------------------------------------------------------------------------
     */
    var NAME = 'modal';
    var VERSION = '4.1.1';
    var DATA_KEY = 'bs.modal';
    var EVENT_KEY = "." + DATA_KEY;
    var DATA_API_KEY = '.data-api';
    var JQUERY_NO_CONFLICT = $$$1.fn[NAME];
    var ESCAPE_KEYCODE = 27; // KeyboardEvent.which value for Escape (Esc) key

    var Default = {
      backdrop: true,
      keyboard: true,
      focus: true,
      show: true
    };
    var DefaultType = {
      backdrop: '(boolean|string)',
      keyboard: 'boolean',
      focus: 'boolean',
      show: 'boolean'
    };
    var Event = {
      HIDE: "hide" + EVENT_KEY,
      HIDDEN: "hidden" + EVENT_KEY,
      SHOW: "show" + EVENT_KEY,
      SHOWN: "shown" + EVENT_KEY,
      FOCUSIN: "focusin" + EVENT_KEY,
      RESIZE: "resize" + EVENT_KEY,
      CLICK_DISMISS: "click.dismiss" + EVENT_KEY,
      KEYDOWN_DISMISS: "keydown.dismiss" + EVENT_KEY,
      MOUSEUP_DISMISS: "mouseup.dismiss" + EVENT_KEY,
      MOUSEDOWN_DISMISS: "mousedown.dismiss" + EVENT_KEY,
      CLICK_DATA_API: "click" + EVENT_KEY + DATA_API_KEY
    };
    var ClassName = {
      SCROLLBAR_MEASURER: 'modal-scrollbar-measure',
      BACKDROP: 'modal-backdrop',
      OPEN: 'modal-open',
      FADE: 'fade',
      SHOW: 'show'
    };
    var Selector = {
      DIALOG: '.modal-dialog',
      DATA_TOGGLE: '[data-toggle="modal"]',
      DATA_DISMISS: '[data-dismiss="modal"]',
      FIXED_CONTENT: '.fixed-top, .fixed-bottom, .is-fixed, .sticky-top',
      STICKY_CONTENT: '.sticky-top',
      NAVBAR_TOGGLER: '.navbar-toggler'
      /**
       * ------------------------------------------------------------------------
       * Class Definition
       * ------------------------------------------------------------------------
       */

    };

    var Modal =
    /*#__PURE__*/
    function () {
      function Modal(element, config) {
        this._config = this._getConfig(config);
        this._element = element;
        this._dialog = $$$1(element).find(Selector.DIALOG)[0];
        this._backdrop = null;
        this._isShown = false;
        this._isBodyOverflowing = false;
        this._ignoreBackdropClick = false;
        this._scrollbarWidth = 0;
      } // Getters


      var _proto = Modal.prototype;

      // Public
      _proto.toggle = function toggle(relatedTarget) {
        return this._isShown ? this.hide() : this.show(relatedTarget);
      };

      _proto.show = function show(relatedTarget) {
        var _this = this;

        if (this._isTransitioning || this._isShown) {
          return;
        }

        if ($$$1(this._element).hasClass(ClassName.FADE)) {
          this._isTransitioning = true;
        }

        var showEvent = $$$1.Event(Event.SHOW, {
          relatedTarget: relatedTarget
        });
        $$$1(this._element).trigger(showEvent);

        if (this._isShown || showEvent.isDefaultPrevented()) {
          return;
        }

        this._isShown = true;

        this._checkScrollbar();

        this._setScrollbar();

        this._adjustDialog();

        $$$1(document.body).addClass(ClassName.OPEN);

        this._setEscapeEvent();

        this._setResizeEvent();

        $$$1(this._element).on(Event.CLICK_DISMISS, Selector.DATA_DISMISS, function (event) {
          return _this.hide(event);
        });
        $$$1(this._dialog).on(Event.MOUSEDOWN_DISMISS, function () {
          $$$1(_this._element).one(Event.MOUSEUP_DISMISS, function (event) {
            if ($$$1(event.target).is(_this._element)) {
              _this._ignoreBackdropClick = true;
            }
          });
        });

        this._showBackdrop(function () {
          return _this._showElement(relatedTarget);
        });
      };

      _proto.hide = function hide(event) {
        var _this2 = this;

        if (event) {
          event.preventDefault();
        }

        if (this._isTransitioning || !this._isShown) {
          return;
        }

        var hideEvent = $$$1.Event(Event.HIDE);
        $$$1(this._element).trigger(hideEvent);

        if (!this._isShown || hideEvent.isDefaultPrevented()) {
          return;
        }

        this._isShown = false;
        var transition = $$$1(this._element).hasClass(ClassName.FADE);

        if (transition) {
          this._isTransitioning = true;
        }

        this._setEscapeEvent();

        this._setResizeEvent();

        $$$1(document).off(Event.FOCUSIN);
        $$$1(this._element).removeClass(ClassName.SHOW);
        $$$1(this._element).off(Event.CLICK_DISMISS);
        $$$1(this._dialog).off(Event.MOUSEDOWN_DISMISS);

        if (transition) {
          var transitionDuration = Util.getTransitionDurationFromElement(this._element);
          $$$1(this._element).one(Util.TRANSITION_END, function (event) {
            return _this2._hideModal(event);
          }).emulateTransitionEnd(transitionDuration);
        } else {
          this._hideModal();
        }
      };

      _proto.dispose = function dispose() {
        $$$1.removeData(this._element, DATA_KEY);
        $$$1(window, document, this._element, this._backdrop).off(EVENT_KEY);
        this._config = null;
        this._element = null;
        this._dialog = null;
        this._backdrop = null;
        this._isShown = null;
        this._isBodyOverflowing = null;
        this._ignoreBackdropClick = null;
        this._scrollbarWidth = null;
      };

      _proto.handleUpdate = function handleUpdate() {
        this._adjustDialog();
      }; // Private


      _proto._getConfig = function _getConfig(config) {
        config = _objectSpread({}, Default, config);
        Util.typeCheckConfig(NAME, config, DefaultType);
        return config;
      };

      _proto._showElement = function _showElement(relatedTarget) {
        var _this3 = this;

        var transition = $$$1(this._element).hasClass(ClassName.FADE);

        if (!this._element.parentNode || this._element.parentNode.nodeType !== Node.ELEMENT_NODE) {
          // Don't move modal's DOM position
          document.body.appendChild(this._element);
        }

        this._element.style.display = 'block';

        this._element.removeAttribute('aria-hidden');

        this._element.scrollTop = 0;

        if (transition) {
          Util.reflow(this._element);
        }

        $$$1(this._element).addClass(ClassName.SHOW);

        if (this._config.focus) {
          this._enforceFocus();
        }

        var shownEvent = $$$1.Event(Event.SHOWN, {
          relatedTarget: relatedTarget
        });

        var transitionComplete = function transitionComplete() {
          if (_this3._config.focus) {
            _this3._element.focus();
          }

          _this3._isTransitioning = false;
          $$$1(_this3._element).trigger(shownEvent);
        };

        if (transition) {
          var transitionDuration = Util.getTransitionDurationFromElement(this._element);
          $$$1(this._dialog).one(Util.TRANSITION_END, transitionComplete).emulateTransitionEnd(transitionDuration);
        } else {
          transitionComplete();
        }
      };

      _proto._enforceFocus = function _enforceFocus() {
        var _this4 = this;

        $$$1(document).off(Event.FOCUSIN) // Guard against infinite focus loop
        .on(Event.FOCUSIN, function (event) {
          if (document !== event.target && _this4._element !== event.target && $$$1(_this4._element).has(event.target).length === 0) {
            _this4._element.focus();
          }
        });
      };

      _proto._setEscapeEvent = function _setEscapeEvent() {
        var _this5 = this;

        if (this._isShown && this._config.keyboard) {
          $$$1(this._element).on(Event.KEYDOWN_DISMISS, function (event) {
            if (event.which === ESCAPE_KEYCODE) {
              event.preventDefault();

              _this5.hide();
            }
          });
        } else if (!this._isShown) {
          $$$1(this._element).off(Event.KEYDOWN_DISMISS);
        }
      };

      _proto._setResizeEvent = function _setResizeEvent() {
        var _this6 = this;

        if (this._isShown) {
          $$$1(window).on(Event.RESIZE, function (event) {
            return _this6.handleUpdate(event);
          });
        } else {
          $$$1(window).off(Event.RESIZE);
        }
      };

      _proto._hideModal = function _hideModal() {
        var _this7 = this;

        this._element.style.display = 'none';

        this._element.setAttribute('aria-hidden', true);

        this._isTransitioning = false;

        this._showBackdrop(function () {
          $$$1(document.body).removeClass(ClassName.OPEN);

          _this7._resetAdjustments();

          _this7._resetScrollbar();

          $$$1(_this7._element).trigger(Event.HIDDEN);
        });
      };

      _proto._removeBackdrop = function _removeBackdrop() {
        if (this._backdrop) {
          $$$1(this._backdrop).remove();
          this._backdrop = null;
        }
      };

      _proto._showBackdrop = function _showBackdrop(callback) {
        var _this8 = this;

        var animate = $$$1(this._element).hasClass(ClassName.FADE) ? ClassName.FADE : '';

        if (this._isShown && this._config.backdrop) {
          this._backdrop = document.createElement('div');
          this._backdrop.className = ClassName.BACKDROP;

          if (animate) {
            $$$1(this._backdrop).addClass(animate);
          }

          $$$1(this._backdrop).appendTo(document.body);
          $$$1(this._element).on(Event.CLICK_DISMISS, function (event) {
            if (_this8._ignoreBackdropClick) {
              _this8._ignoreBackdropClick = false;
              return;
            }

            if (event.target !== event.currentTarget) {
              return;
            }

            if (_this8._config.backdrop === 'static') {
              _this8._element.focus();
            } else {
              _this8.hide();
            }
          });

          if (animate) {
            Util.reflow(this._backdrop);
          }

          $$$1(this._backdrop).addClass(ClassName.SHOW);

          if (!callback) {
            return;
          }

          if (!animate) {
            callback();
            return;
          }

          var backdropTransitionDuration = Util.getTransitionDurationFromElement(this._backdrop);
          $$$1(this._backdrop).one(Util.TRANSITION_END, callback).emulateTransitionEnd(backdropTransitionDuration);
        } else if (!this._isShown && this._backdrop) {
          $$$1(this._backdrop).removeClass(ClassName.SHOW);

          var callbackRemove = function callbackRemove() {
            _this8._removeBackdrop();

            if (callback) {
              callback();
            }
          };

          if ($$$1(this._element).hasClass(ClassName.FADE)) {
            var _backdropTransitionDuration = Util.getTransitionDurationFromElement(this._backdrop);

            $$$1(this._backdrop).one(Util.TRANSITION_END, callbackRemove).emulateTransitionEnd(_backdropTransitionDuration);
          } else {
            callbackRemove();
          }
        } else if (callback) {
          callback();
        }
      }; // ----------------------------------------------------------------------
      // the following methods are used to handle overflowing modals
      // todo (fat): these should probably be refactored out of modal.js
      // ----------------------------------------------------------------------


      _proto._adjustDialog = function _adjustDialog() {
        var isModalOverflowing = this._element.scrollHeight > document.documentElement.clientHeight;

        if (!this._isBodyOverflowing && isModalOverflowing) {
          this._element.style.paddingLeft = this._scrollbarWidth + "px";
        }

        if (this._isBodyOverflowing && !isModalOverflowing) {
          this._element.style.paddingRight = this._scrollbarWidth + "px";
        }
      };

      _proto._resetAdjustments = function _resetAdjustments() {
        this._element.style.paddingLeft = '';
        this._element.style.paddingRight = '';
      };

      _proto._checkScrollbar = function _checkScrollbar() {
        var rect = document.body.getBoundingClientRect();
        this._isBodyOverflowing = rect.left + rect.right < window.innerWidth;
        this._scrollbarWidth = this._getScrollbarWidth();
      };

      _proto._setScrollbar = function _setScrollbar() {
        var _this9 = this;

        if (this._isBodyOverflowing) {
          // Note: DOMNode.style.paddingRight returns the actual value or '' if not set
          //   while $(DOMNode).css('padding-right') returns the calculated value or 0 if not set
          // Adjust fixed content padding
          $$$1(Selector.FIXED_CONTENT).each(function (index, element) {
            var actualPadding = $$$1(element)[0].style.paddingRight;
            var calculatedPadding = $$$1(element).css('padding-right');
            $$$1(element).data('padding-right', actualPadding).css('padding-right', parseFloat(calculatedPadding) + _this9._scrollbarWidth + "px");
          }); // Adjust sticky content margin

          $$$1(Selector.STICKY_CONTENT).each(function (index, element) {
            var actualMargin = $$$1(element)[0].style.marginRight;
            var calculatedMargin = $$$1(element).css('margin-right');
            $$$1(element).data('margin-right', actualMargin).css('margin-right', parseFloat(calculatedMargin) - _this9._scrollbarWidth + "px");
          }); // Adjust navbar-toggler margin

          $$$1(Selector.NAVBAR_TOGGLER).each(function (index, element) {
            var actualMargin = $$$1(element)[0].style.marginRight;
            var calculatedMargin = $$$1(element).css('margin-right');
            $$$1(element).data('margin-right', actualMargin).css('margin-right', parseFloat(calculatedMargin) + _this9._scrollbarWidth + "px");
          }); // Adjust body padding

          var actualPadding = document.body.style.paddingRight;
          var calculatedPadding = $$$1(document.body).css('padding-right');
          $$$1(document.body).data('padding-right', actualPadding).css('padding-right', parseFloat(calculatedPadding) + this._scrollbarWidth + "px");
        }
      };

      _proto._resetScrollbar = function _resetScrollbar() {
        // Restore fixed content padding
        $$$1(Selector.FIXED_CONTENT).each(function (index, element) {
          var padding = $$$1(element).data('padding-right');

          if (typeof padding !== 'undefined') {
            $$$1(element).css('padding-right', padding).removeData('padding-right');
          }
        }); // Restore sticky content and navbar-toggler margin

        $$$1(Selector.STICKY_CONTENT + ", " + Selector.NAVBAR_TOGGLER).each(function (index, element) {
          var margin = $$$1(element).data('margin-right');

          if (typeof margin !== 'undefined') {
            $$$1(element).css('margin-right', margin).removeData('margin-right');
          }
        }); // Restore body padding

        var padding = $$$1(document.body).data('padding-right');

        if (typeof padding !== 'undefined') {
          $$$1(document.body).css('padding-right', padding).removeData('padding-right');
        }
      };

      _proto._getScrollbarWidth = function _getScrollbarWidth() {
        // thx d.walsh
        var scrollDiv = document.createElement('div');
        scrollDiv.className = ClassName.SCROLLBAR_MEASURER;
        document.body.appendChild(scrollDiv);
        var scrollbarWidth = scrollDiv.getBoundingClientRect().width - scrollDiv.clientWidth;
        document.body.removeChild(scrollDiv);
        return scrollbarWidth;
      }; // Static


      Modal._jQueryInterface = function _jQueryInterface(config, relatedTarget) {
        return this.each(function () {
          var data = $$$1(this).data(DATA_KEY);

          var _config = _objectSpread({}, Default, $$$1(this).data(), typeof config === 'object' && config ? config : {});

          if (!data) {
            data = new Modal(this, _config);
            $$$1(this).data(DATA_KEY, data);
          }

          if (typeof config === 'string') {
            if (typeof data[config] === 'undefined') {
              throw new TypeError("No method named \"" + config + "\"");
            }

            data[config](relatedTarget);
          } else if (_config.show) {
            data.show(relatedTarget);
          }
        });
      };

      _createClass(Modal, null, [{
        key: "VERSION",
        get: function get() {
          return VERSION;
        }
      }, {
        key: "Default",
        get: function get() {
          return Default;
        }
      }]);

      return Modal;
    }();
    /**
     * ------------------------------------------------------------------------
     * Data Api implementation
     * ------------------------------------------------------------------------
     */


    $$$1(document).on(Event.CLICK_DATA_API, Selector.DATA_TOGGLE, function (event) {
      var _this10 = this;

      var target;
      var selector = Util.getSelectorFromElement(this);

      if (selector) {
        target = $$$1(selector)[0];
      }

      var config = $$$1(target).data(DATA_KEY) ? 'toggle' : _objectSpread({}, $$$1(target).data(), $$$1(this).data());

      if (this.tagName === 'A' || this.tagName === 'AREA') {
        event.preventDefault();
      }

      var $target = $$$1(target).one(Event.SHOW, function (showEvent) {
        if (showEvent.isDefaultPrevented()) {
          // Only register focus restorer if modal will actually get shown
          return;
        }

        $target.one(Event.HIDDEN, function () {
          if ($$$1(_this10).is(':visible')) {
            _this10.focus();
          }
        });
      });

      Modal._jQueryInterface.call($$$1(target), config, this);
    });
    /**
     * ------------------------------------------------------------------------
     * jQuery
     * ------------------------------------------------------------------------
     */

    $$$1.fn[NAME] = Modal._jQueryInterface;
    $$$1.fn[NAME].Constructor = Modal;

    $$$1.fn[NAME].noConflict = function () {
      $$$1.fn[NAME] = JQUERY_NO_CONFLICT;
      return Modal._jQueryInterface;
    };

    return Modal;
  }($);

  /**
   * --------------------------------------------------------------------------
   * Bootstrap (v4.1.1): tooltip.js
   * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
   * --------------------------------------------------------------------------
   */

  var Tooltip = function ($$$1) {
    /**
     * ------------------------------------------------------------------------
     * Constants
     * ------------------------------------------------------------------------
     */
    var NAME = 'tooltip';
    var VERSION = '4.1.1';
    var DATA_KEY = 'bs.tooltip';
    var EVENT_KEY = "." + DATA_KEY;
    var JQUERY_NO_CONFLICT = $$$1.fn[NAME];
    var CLASS_PREFIX = 'bs-tooltip';
    var BSCLS_PREFIX_REGEX = new RegExp("(^|\\s)" + CLASS_PREFIX + "\\S+", 'g');
    var DefaultType = {
      animation: 'boolean',
      template: 'string',
      title: '(string|element|function)',
      trigger: 'string',
      delay: '(number|object)',
      html: 'boolean',
      selector: '(string|boolean)',
      placement: '(string|function)',
      offset: '(number|string)',
      container: '(string|element|boolean)',
      fallbackPlacement: '(string|array)',
      boundary: '(string|element)'
    };
    var AttachmentMap = {
      AUTO: 'auto',
      TOP: 'top',
      RIGHT: 'right',
      BOTTOM: 'bottom',
      LEFT: 'left'
    };
    var Default = {
      animation: true,
      template: '<div class="tooltip" role="tooltip">' + '<div class="arrow"></div>' + '<div class="tooltip-inner"></div></div>',
      trigger: 'hover focus',
      title: '',
      delay: 0,
      html: false,
      selector: false,
      placement: 'top',
      offset: 0,
      container: false,
      fallbackPlacement: 'flip',
      boundary: 'scrollParent'
    };
    var HoverState = {
      SHOW: 'show',
      OUT: 'out'
    };
    var Event = {
      HIDE: "hide" + EVENT_KEY,
      HIDDEN: "hidden" + EVENT_KEY,
      SHOW: "show" + EVENT_KEY,
      SHOWN: "shown" + EVENT_KEY,
      INSERTED: "inserted" + EVENT_KEY,
      CLICK: "click" + EVENT_KEY,
      FOCUSIN: "focusin" + EVENT_KEY,
      FOCUSOUT: "focusout" + EVENT_KEY,
      MOUSEENTER: "mouseenter" + EVENT_KEY,
      MOUSELEAVE: "mouseleave" + EVENT_KEY
    };
    var ClassName = {
      FADE: 'fade',
      SHOW: 'show'
    };
    var Selector = {
      TOOLTIP: '.tooltip',
      TOOLTIP_INNER: '.tooltip-inner',
      ARROW: '.arrow'
    };
    var Trigger = {
      HOVER: 'hover',
      FOCUS: 'focus',
      CLICK: 'click',
      MANUAL: 'manual'
      /**
       * ------------------------------------------------------------------------
       * Class Definition
       * ------------------------------------------------------------------------
       */

    };

    var Tooltip =
    /*#__PURE__*/
    function () {
      function Tooltip(element, config) {
        /**
         * Check for Popper dependency
         * Popper - https://popper.js.org
         */
        if (typeof Popper === 'undefined') {
          throw new TypeError('Bootstrap tooltips require Popper.js (https://popper.js.org)');
        } // private


        this._isEnabled = true;
        this._timeout = 0;
        this._hoverState = '';
        this._activeTrigger = {};
        this._popper = null; // Protected

        this.element = element;
        this.config = this._getConfig(config);
        this.tip = null;

        this._setListeners();
      } // Getters


      var _proto = Tooltip.prototype;

      // Public
      _proto.enable = function enable() {
        this._isEnabled = true;
      };

      _proto.disable = function disable() {
        this._isEnabled = false;
      };

      _proto.toggleEnabled = function toggleEnabled() {
        this._isEnabled = !this._isEnabled;
      };

      _proto.toggle = function toggle(event) {
        if (!this._isEnabled) {
          return;
        }

        if (event) {
          var dataKey = this.constructor.DATA_KEY;
          var context = $$$1(event.currentTarget).data(dataKey);

          if (!context) {
            context = new this.constructor(event.currentTarget, this._getDelegateConfig());
            $$$1(event.currentTarget).data(dataKey, context);
          }

          context._activeTrigger.click = !context._activeTrigger.click;

          if (context._isWithActiveTrigger()) {
            context._enter(null, context);
          } else {
            context._leave(null, context);
          }
        } else {
          if ($$$1(this.getTipElement()).hasClass(ClassName.SHOW)) {
            this._leave(null, this);

            return;
          }

          this._enter(null, this);
        }
      };

      _proto.dispose = function dispose() {
        clearTimeout(this._timeout);
        $$$1.removeData(this.element, this.constructor.DATA_KEY);
        $$$1(this.element).off(this.constructor.EVENT_KEY);
        $$$1(this.element).closest('.modal').off('hide.bs.modal');

        if (this.tip) {
          $$$1(this.tip).remove();
        }

        this._isEnabled = null;
        this._timeout = null;
        this._hoverState = null;
        this._activeTrigger = null;

        if (this._popper !== null) {
          this._popper.destroy();
        }

        this._popper = null;
        this.element = null;
        this.config = null;
        this.tip = null;
      };

      _proto.show = function show() {
        var _this = this;

        if ($$$1(this.element).css('display') === 'none') {
          throw new Error('Please use show on visible elements');
        }

        var showEvent = $$$1.Event(this.constructor.Event.SHOW);

        if (this.isWithContent() && this._isEnabled) {
          $$$1(this.element).trigger(showEvent);
          var isInTheDom = $$$1.contains(this.element.ownerDocument.documentElement, this.element);

          if (showEvent.isDefaultPrevented() || !isInTheDom) {
            return;
          }

          var tip = this.getTipElement();
          var tipId = Util.getUID(this.constructor.NAME);
          tip.setAttribute('id', tipId);
          this.element.setAttribute('aria-describedby', tipId);
          this.setContent();

          if (this.config.animation) {
            $$$1(tip).addClass(ClassName.FADE);
          }

          var placement = typeof this.config.placement === 'function' ? this.config.placement.call(this, tip, this.element) : this.config.placement;

          var attachment = this._getAttachment(placement);

          this.addAttachmentClass(attachment);
          var container = this.config.container === false ? document.body : $$$1(this.config.container);
          $$$1(tip).data(this.constructor.DATA_KEY, this);

          if (!$$$1.contains(this.element.ownerDocument.documentElement, this.tip)) {
            $$$1(tip).appendTo(container);
          }

          $$$1(this.element).trigger(this.constructor.Event.INSERTED);
          this._popper = new Popper(this.element, tip, {
            placement: attachment,
            modifiers: {
              offset: {
                offset: this.config.offset
              },
              flip: {
                behavior: this.config.fallbackPlacement
              },
              arrow: {
                element: Selector.ARROW
              },
              preventOverflow: {
                boundariesElement: this.config.boundary
              }
            },
            onCreate: function onCreate(data) {
              if (data.originalPlacement !== data.placement) {
                _this._handlePopperPlacementChange(data);
              }
            },
            onUpdate: function onUpdate(data) {
              _this._handlePopperPlacementChange(data);
            }
          });
          $$$1(tip).addClass(ClassName.SHOW); // If this is a touch-enabled device we add extra
          // empty mouseover listeners to the body's immediate children;
          // only needed because of broken event delegation on iOS
          // https://www.quirksmode.org/blog/archives/2014/02/mouse_event_bub.html

          if ('ontouchstart' in document.documentElement) {
            $$$1(document.body).children().on('mouseover', null, $$$1.noop);
          }

          var complete = function complete() {
            if (_this.config.animation) {
              _this._fixTransition();
            }

            var prevHoverState = _this._hoverState;
            _this._hoverState = null;
            $$$1(_this.element).trigger(_this.constructor.Event.SHOWN);

            if (prevHoverState === HoverState.OUT) {
              _this._leave(null, _this);
            }
          };

          if ($$$1(this.tip).hasClass(ClassName.FADE)) {
            var transitionDuration = Util.getTransitionDurationFromElement(this.tip);
            $$$1(this.tip).one(Util.TRANSITION_END, complete).emulateTransitionEnd(transitionDuration);
          } else {
            complete();
          }
        }
      };

      _proto.hide = function hide(callback) {
        var _this2 = this;

        var tip = this.getTipElement();
        var hideEvent = $$$1.Event(this.constructor.Event.HIDE);

        var complete = function complete() {
          if (_this2._hoverState !== HoverState.SHOW && tip.parentNode) {
            tip.parentNode.removeChild(tip);
          }

          _this2._cleanTipClass();

          _this2.element.removeAttribute('aria-describedby');

          $$$1(_this2.element).trigger(_this2.constructor.Event.HIDDEN);

          if (_this2._popper !== null) {
            _this2._popper.destroy();
          }

          if (callback) {
            callback();
          }
        };

        $$$1(this.element).trigger(hideEvent);

        if (hideEvent.isDefaultPrevented()) {
          return;
        }

        $$$1(tip).removeClass(ClassName.SHOW); // If this is a touch-enabled device we remove the extra
        // empty mouseover listeners we added for iOS support

        if ('ontouchstart' in document.documentElement) {
          $$$1(document.body).children().off('mouseover', null, $$$1.noop);
        }

        this._activeTrigger[Trigger.CLICK] = false;
        this._activeTrigger[Trigger.FOCUS] = false;
        this._activeTrigger[Trigger.HOVER] = false;

        if ($$$1(this.tip).hasClass(ClassName.FADE)) {
          var transitionDuration = Util.getTransitionDurationFromElement(tip);
          $$$1(tip).one(Util.TRANSITION_END, complete).emulateTransitionEnd(transitionDuration);
        } else {
          complete();
        }

        this._hoverState = '';
      };

      _proto.update = function update() {
        if (this._popper !== null) {
          this._popper.scheduleUpdate();
        }
      }; // Protected


      _proto.isWithContent = function isWithContent() {
        return Boolean(this.getTitle());
      };

      _proto.addAttachmentClass = function addAttachmentClass(attachment) {
        $$$1(this.getTipElement()).addClass(CLASS_PREFIX + "-" + attachment);
      };

      _proto.getTipElement = function getTipElement() {
        this.tip = this.tip || $$$1(this.config.template)[0];
        return this.tip;
      };

      _proto.setContent = function setContent() {
        var $tip = $$$1(this.getTipElement());
        this.setElementContent($tip.find(Selector.TOOLTIP_INNER), this.getTitle());
        $tip.removeClass(ClassName.FADE + " " + ClassName.SHOW);
      };

      _proto.setElementContent = function setElementContent($element, content) {
        var html = this.config.html;

        if (typeof content === 'object' && (content.nodeType || content.jquery)) {
          // Content is a DOM node or a jQuery
          if (html) {
            if (!$$$1(content).parent().is($element)) {
              $element.empty().append(content);
            }
          } else {
            $element.text($$$1(content).text());
          }
        } else {
          $element[html ? 'html' : 'text'](content);
        }
      };

      _proto.getTitle = function getTitle() {
        var title = this.element.getAttribute('data-original-title');

        if (!title) {
          title = typeof this.config.title === 'function' ? this.config.title.call(this.element) : this.config.title;
        }

        return title;
      }; // Private


      _proto._getAttachment = function _getAttachment(placement) {
        return AttachmentMap[placement.toUpperCase()];
      };

      _proto._setListeners = function _setListeners() {
        var _this3 = this;

        var triggers = this.config.trigger.split(' ');
        triggers.forEach(function (trigger) {
          if (trigger === 'click') {
            $$$1(_this3.element).on(_this3.constructor.Event.CLICK, _this3.config.selector, function (event) {
              return _this3.toggle(event);
            });
          } else if (trigger !== Trigger.MANUAL) {
            var eventIn = trigger === Trigger.HOVER ? _this3.constructor.Event.MOUSEENTER : _this3.constructor.Event.FOCUSIN;
            var eventOut = trigger === Trigger.HOVER ? _this3.constructor.Event.MOUSELEAVE : _this3.constructor.Event.FOCUSOUT;
            $$$1(_this3.element).on(eventIn, _this3.config.selector, function (event) {
              return _this3._enter(event);
            }).on(eventOut, _this3.config.selector, function (event) {
              return _this3._leave(event);
            });
          }

          $$$1(_this3.element).closest('.modal').on('hide.bs.modal', function () {
            return _this3.hide();
          });
        });

        if (this.config.selector) {
          this.config = _objectSpread({}, this.config, {
            trigger: 'manual',
            selector: ''
          });
        } else {
          this._fixTitle();
        }
      };

      _proto._fixTitle = function _fixTitle() {
        var titleType = typeof this.element.getAttribute('data-original-title');

        if (this.element.getAttribute('title') || titleType !== 'string') {
          this.element.setAttribute('data-original-title', this.element.getAttribute('title') || '');
          this.element.setAttribute('title', '');
        }
      };

      _proto._enter = function _enter(event, context) {
        var dataKey = this.constructor.DATA_KEY;
        context = context || $$$1(event.currentTarget).data(dataKey);

        if (!context) {
          context = new this.constructor(event.currentTarget, this._getDelegateConfig());
          $$$1(event.currentTarget).data(dataKey, context);
        }

        if (event) {
          context._activeTrigger[event.type === 'focusin' ? Trigger.FOCUS : Trigger.HOVER] = true;
        }

        if ($$$1(context.getTipElement()).hasClass(ClassName.SHOW) || context._hoverState === HoverState.SHOW) {
          context._hoverState = HoverState.SHOW;
          return;
        }

        clearTimeout(context._timeout);
        context._hoverState = HoverState.SHOW;

        if (!context.config.delay || !context.config.delay.show) {
          context.show();
          return;
        }

        context._timeout = setTimeout(function () {
          if (context._hoverState === HoverState.SHOW) {
            context.show();
          }
        }, context.config.delay.show);
      };

      _proto._leave = function _leave(event, context) {
        var dataKey = this.constructor.DATA_KEY;
        context = context || $$$1(event.currentTarget).data(dataKey);

        if (!context) {
          context = new this.constructor(event.currentTarget, this._getDelegateConfig());
          $$$1(event.currentTarget).data(dataKey, context);
        }

        if (event) {
          context._activeTrigger[event.type === 'focusout' ? Trigger.FOCUS : Trigger.HOVER] = false;
        }

        if (context._isWithActiveTrigger()) {
          return;
        }

        clearTimeout(context._timeout);
        context._hoverState = HoverState.OUT;

        if (!context.config.delay || !context.config.delay.hide) {
          context.hide();
          return;
        }

        context._timeout = setTimeout(function () {
          if (context._hoverState === HoverState.OUT) {
            context.hide();
          }
        }, context.config.delay.hide);
      };

      _proto._isWithActiveTrigger = function _isWithActiveTrigger() {
        for (var trigger in this._activeTrigger) {
          if (this._activeTrigger[trigger]) {
            return true;
          }
        }

        return false;
      };

      _proto._getConfig = function _getConfig(config) {
        config = _objectSpread({}, this.constructor.Default, $$$1(this.element).data(), typeof config === 'object' && config ? config : {});

        if (typeof config.delay === 'number') {
          config.delay = {
            show: config.delay,
            hide: config.delay
          };
        }

        if (typeof config.title === 'number') {
          config.title = config.title.toString();
        }

        if (typeof config.content === 'number') {
          config.content = config.content.toString();
        }

        Util.typeCheckConfig(NAME, config, this.constructor.DefaultType);
        return config;
      };

      _proto._getDelegateConfig = function _getDelegateConfig() {
        var config = {};

        if (this.config) {
          for (var key in this.config) {
            if (this.constructor.Default[key] !== this.config[key]) {
              config[key] = this.config[key];
            }
          }
        }

        return config;
      };

      _proto._cleanTipClass = function _cleanTipClass() {
        var $tip = $$$1(this.getTipElement());
        var tabClass = $tip.attr('class').match(BSCLS_PREFIX_REGEX);

        if (tabClass !== null && tabClass.length > 0) {
          $tip.removeClass(tabClass.join(''));
        }
      };

      _proto._handlePopperPlacementChange = function _handlePopperPlacementChange(data) {
        this._cleanTipClass();

        this.addAttachmentClass(this._getAttachment(data.placement));
      };

      _proto._fixTransition = function _fixTransition() {
        var tip = this.getTipElement();
        var initConfigAnimation = this.config.animation;

        if (tip.getAttribute('x-placement') !== null) {
          return;
        }

        $$$1(tip).removeClass(ClassName.FADE);
        this.config.animation = false;
        this.hide();
        this.show();
        this.config.animation = initConfigAnimation;
      }; // Static


      Tooltip._jQueryInterface = function _jQueryInterface(config) {
        return this.each(function () {
          var data = $$$1(this).data(DATA_KEY);

          var _config = typeof config === 'object' && config;

          if (!data && /dispose|hide/.test(config)) {
            return;
          }

          if (!data) {
            data = new Tooltip(this, _config);
            $$$1(this).data(DATA_KEY, data);
          }

          if (typeof config === 'string') {
            if (typeof data[config] === 'undefined') {
              throw new TypeError("No method named \"" + config + "\"");
            }

            data[config]();
          }
        });
      };

      _createClass(Tooltip, null, [{
        key: "VERSION",
        get: function get() {
          return VERSION;
        }
      }, {
        key: "Default",
        get: function get() {
          return Default;
        }
      }, {
        key: "NAME",
        get: function get() {
          return NAME;
        }
      }, {
        key: "DATA_KEY",
        get: function get() {
          return DATA_KEY;
        }
      }, {
        key: "Event",
        get: function get() {
          return Event;
        }
      }, {
        key: "EVENT_KEY",
        get: function get() {
          return EVENT_KEY;
        }
      }, {
        key: "DefaultType",
        get: function get() {
          return DefaultType;
        }
      }]);

      return Tooltip;
    }();
    /**
     * ------------------------------------------------------------------------
     * jQuery
     * ------------------------------------------------------------------------
     */


    $$$1.fn[NAME] = Tooltip._jQueryInterface;
    $$$1.fn[NAME].Constructor = Tooltip;

    $$$1.fn[NAME].noConflict = function () {
      $$$1.fn[NAME] = JQUERY_NO_CONFLICT;
      return Tooltip._jQueryInterface;
    };

    return Tooltip;
  }($, Popper);

  /**
   * --------------------------------------------------------------------------
   * Bootstrap (v4.1.1): popover.js
   * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
   * --------------------------------------------------------------------------
   */

  var Popover = function ($$$1) {
    /**
     * ------------------------------------------------------------------------
     * Constants
     * ------------------------------------------------------------------------
     */
    var NAME = 'popover';
    var VERSION = '4.1.1';
    var DATA_KEY = 'bs.popover';
    var EVENT_KEY = "." + DATA_KEY;
    var JQUERY_NO_CONFLICT = $$$1.fn[NAME];
    var CLASS_PREFIX = 'bs-popover';
    var BSCLS_PREFIX_REGEX = new RegExp("(^|\\s)" + CLASS_PREFIX + "\\S+", 'g');

    var Default = _objectSpread({}, Tooltip.Default, {
      placement: 'right',
      trigger: 'click',
      content: '',
      template: '<div class="popover" role="tooltip">' + '<div class="arrow"></div>' + '<h3 class="popover-header"></h3>' + '<div class="popover-body"></div></div>'
    });

    var DefaultType = _objectSpread({}, Tooltip.DefaultType, {
      content: '(string|element|function)'
    });

    var ClassName = {
      FADE: 'fade',
      SHOW: 'show'
    };
    var Selector = {
      TITLE: '.popover-header',
      CONTENT: '.popover-body'
    };
    var Event = {
      HIDE: "hide" + EVENT_KEY,
      HIDDEN: "hidden" + EVENT_KEY,
      SHOW: "show" + EVENT_KEY,
      SHOWN: "shown" + EVENT_KEY,
      INSERTED: "inserted" + EVENT_KEY,
      CLICK: "click" + EVENT_KEY,
      FOCUSIN: "focusin" + EVENT_KEY,
      FOCUSOUT: "focusout" + EVENT_KEY,
      MOUSEENTER: "mouseenter" + EVENT_KEY,
      MOUSELEAVE: "mouseleave" + EVENT_KEY
      /**
       * ------------------------------------------------------------------------
       * Class Definition
       * ------------------------------------------------------------------------
       */

    };

    var Popover =
    /*#__PURE__*/
    function (_Tooltip) {
      _inheritsLoose(Popover, _Tooltip);

      function Popover() {
        return _Tooltip.apply(this, arguments) || this;
      }

      var _proto = Popover.prototype;

      // Overrides
      _proto.isWithContent = function isWithContent() {
        return this.getTitle() || this._getContent();
      };

      _proto.addAttachmentClass = function addAttachmentClass(attachment) {
        $$$1(this.getTipElement()).addClass(CLASS_PREFIX + "-" + attachment);
      };

      _proto.getTipElement = function getTipElement() {
        this.tip = this.tip || $$$1(this.config.template)[0];
        return this.tip;
      };

      _proto.setContent = function setContent() {
        var $tip = $$$1(this.getTipElement()); // We use append for html objects to maintain js events

        this.setElementContent($tip.find(Selector.TITLE), this.getTitle());

        var content = this._getContent();

        if (typeof content === 'function') {
          content = content.call(this.element);
        }

        this.setElementContent($tip.find(Selector.CONTENT), content);
        $tip.removeClass(ClassName.FADE + " " + ClassName.SHOW);
      }; // Private


      _proto._getContent = function _getContent() {
        return this.element.getAttribute('data-content') || this.config.content;
      };

      _proto._cleanTipClass = function _cleanTipClass() {
        var $tip = $$$1(this.getTipElement());
        var tabClass = $tip.attr('class').match(BSCLS_PREFIX_REGEX);

        if (tabClass !== null && tabClass.length > 0) {
          $tip.removeClass(tabClass.join(''));
        }
      }; // Static


      Popover._jQueryInterface = function _jQueryInterface(config) {
        return this.each(function () {
          var data = $$$1(this).data(DATA_KEY);

          var _config = typeof config === 'object' ? config : null;

          if (!data && /destroy|hide/.test(config)) {
            return;
          }

          if (!data) {
            data = new Popover(this, _config);
            $$$1(this).data(DATA_KEY, data);
          }

          if (typeof config === 'string') {
            if (typeof data[config] === 'undefined') {
              throw new TypeError("No method named \"" + config + "\"");
            }

            data[config]();
          }
        });
      };

      _createClass(Popover, null, [{
        key: "VERSION",
        // Getters
        get: function get() {
          return VERSION;
        }
      }, {
        key: "Default",
        get: function get() {
          return Default;
        }
      }, {
        key: "NAME",
        get: function get() {
          return NAME;
        }
      }, {
        key: "DATA_KEY",
        get: function get() {
          return DATA_KEY;
        }
      }, {
        key: "Event",
        get: function get() {
          return Event;
        }
      }, {
        key: "EVENT_KEY",
        get: function get() {
          return EVENT_KEY;
        }
      }, {
        key: "DefaultType",
        get: function get() {
          return DefaultType;
        }
      }]);

      return Popover;
    }(Tooltip);
    /**
     * ------------------------------------------------------------------------
     * jQuery
     * ------------------------------------------------------------------------
     */


    $$$1.fn[NAME] = Popover._jQueryInterface;
    $$$1.fn[NAME].Constructor = Popover;

    $$$1.fn[NAME].noConflict = function () {
      $$$1.fn[NAME] = JQUERY_NO_CONFLICT;
      return Popover._jQueryInterface;
    };

    return Popover;
  }($);

  /**
   * --------------------------------------------------------------------------
   * Bootstrap (v4.1.1): scrollspy.js
   * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
   * --------------------------------------------------------------------------
   */

  var ScrollSpy = function ($$$1) {
    /**
     * ------------------------------------------------------------------------
     * Constants
     * ------------------------------------------------------------------------
     */
    var NAME = 'scrollspy';
    var VERSION = '4.1.1';
    var DATA_KEY = 'bs.scrollspy';
    var EVENT_KEY = "." + DATA_KEY;
    var DATA_API_KEY = '.data-api';
    var JQUERY_NO_CONFLICT = $$$1.fn[NAME];
    var Default = {
      offset: 10,
      method: 'auto',
      target: ''
    };
    var DefaultType = {
      offset: 'number',
      method: 'string',
      target: '(string|element)'
    };
    var Event = {
      ACTIVATE: "activate" + EVENT_KEY,
      SCROLL: "scroll" + EVENT_KEY,
      LOAD_DATA_API: "load" + EVENT_KEY + DATA_API_KEY
    };
    var ClassName = {
      DROPDOWN_ITEM: 'dropdown-item',
      DROPDOWN_MENU: 'dropdown-menu',
      ACTIVE: 'active'
    };
    var Selector = {
      DATA_SPY: '[data-spy="scroll"]',
      ACTIVE: '.active',
      NAV_LIST_GROUP: '.nav, .list-group',
      NAV_LINKS: '.nav-link',
      NAV_ITEMS: '.nav-item',
      LIST_ITEMS: '.list-group-item',
      DROPDOWN: '.dropdown',
      DROPDOWN_ITEMS: '.dropdown-item',
      DROPDOWN_TOGGLE: '.dropdown-toggle'
    };
    var OffsetMethod = {
      OFFSET: 'offset',
      POSITION: 'position'
      /**
       * ------------------------------------------------------------------------
       * Class Definition
       * ------------------------------------------------------------------------
       */

    };

    var ScrollSpy =
    /*#__PURE__*/
    function () {
      function ScrollSpy(element, config) {
        var _this = this;

        this._element = element;
        this._scrollElement = element.tagName === 'BODY' ? window : element;
        this._config = this._getConfig(config);
        this._selector = this._config.target + " " + Selector.NAV_LINKS + "," + (this._config.target + " " + Selector.LIST_ITEMS + ",") + (this._config.target + " " + Selector.DROPDOWN_ITEMS);
        this._offsets = [];
        this._targets = [];
        this._activeTarget = null;
        this._scrollHeight = 0;
        $$$1(this._scrollElement).on(Event.SCROLL, function (event) {
          return _this._process(event);
        });
        this.refresh();

        this._process();
      } // Getters


      var _proto = ScrollSpy.prototype;

      // Public
      _proto.refresh = function refresh() {
        var _this2 = this;

        var autoMethod = this._scrollElement === this._scrollElement.window ? OffsetMethod.OFFSET : OffsetMethod.POSITION;
        var offsetMethod = this._config.method === 'auto' ? autoMethod : this._config.method;
        var offsetBase = offsetMethod === OffsetMethod.POSITION ? this._getScrollTop() : 0;
        this._offsets = [];
        this._targets = [];
        this._scrollHeight = this._getScrollHeight();
        var targets = $$$1.makeArray($$$1(this._selector));
        targets.map(function (element) {
          var target;
          var targetSelector = Util.getSelectorFromElement(element);

          if (targetSelector) {
            target = $$$1(targetSelector)[0];
          }

          if (target) {
            var targetBCR = target.getBoundingClientRect();

            if (targetBCR.width || targetBCR.height) {
              // TODO (fat): remove sketch reliance on jQuery position/offset
              return [$$$1(target)[offsetMethod]().top + offsetBase, targetSelector];
            }
          }

          return null;
        }).filter(function (item) {
          return item;
        }).sort(function (a, b) {
          return a[0] - b[0];
        }).forEach(function (item) {
          _this2._offsets.push(item[0]);

          _this2._targets.push(item[1]);
        });
      };

      _proto.dispose = function dispose() {
        $$$1.removeData(this._element, DATA_KEY);
        $$$1(this._scrollElement).off(EVENT_KEY);
        this._element = null;
        this._scrollElement = null;
        this._config = null;
        this._selector = null;
        this._offsets = null;
        this._targets = null;
        this._activeTarget = null;
        this._scrollHeight = null;
      }; // Private


      _proto._getConfig = function _getConfig(config) {
        config = _objectSpread({}, Default, typeof config === 'object' && config ? config : {});

        if (typeof config.target !== 'string') {
          var id = $$$1(config.target).attr('id');

          if (!id) {
            id = Util.getUID(NAME);
            $$$1(config.target).attr('id', id);
          }

          config.target = "#" + id;
        }

        Util.typeCheckConfig(NAME, config, DefaultType);
        return config;
      };

      _proto._getScrollTop = function _getScrollTop() {
        return this._scrollElement === window ? this._scrollElement.pageYOffset : this._scrollElement.scrollTop;
      };

      _proto._getScrollHeight = function _getScrollHeight() {
        return this._scrollElement.scrollHeight || Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
      };

      _proto._getOffsetHeight = function _getOffsetHeight() {
        return this._scrollElement === window ? window.innerHeight : this._scrollElement.getBoundingClientRect().height;
      };

      _proto._process = function _process() {
        var scrollTop = this._getScrollTop() + this._config.offset;

        var scrollHeight = this._getScrollHeight();

        var maxScroll = this._config.offset + scrollHeight - this._getOffsetHeight();

        if (this._scrollHeight !== scrollHeight) {
          this.refresh();
        }

        if (scrollTop >= maxScroll) {
          var target = this._targets[this._targets.length - 1];

          if (this._activeTarget !== target) {
            this._activate(target);
          }

          return;
        }

        if (this._activeTarget && scrollTop < this._offsets[0] && this._offsets[0] > 0) {
          this._activeTarget = null;

          this._clear();

          return;
        }

        for (var i = this._offsets.length; i--;) {
          var isActiveTarget = this._activeTarget !== this._targets[i] && scrollTop >= this._offsets[i] && (typeof this._offsets[i + 1] === 'undefined' || scrollTop < this._offsets[i + 1]);

          if (isActiveTarget) {
            this._activate(this._targets[i]);
          }
        }
      };

      _proto._activate = function _activate(target) {
        this._activeTarget = target;

        this._clear();

        var queries = this._selector.split(','); // eslint-disable-next-line arrow-body-style


        queries = queries.map(function (selector) {
          return selector + "[data-target=\"" + target + "\"]," + (selector + "[href=\"" + target + "\"]");
        });
        var $link = $$$1(queries.join(','));

        if ($link.hasClass(ClassName.DROPDOWN_ITEM)) {
          $link.closest(Selector.DROPDOWN).find(Selector.DROPDOWN_TOGGLE).addClass(ClassName.ACTIVE);
          $link.addClass(ClassName.ACTIVE);
        } else {
          // Set triggered link as active
          $link.addClass(ClassName.ACTIVE); // Set triggered links parents as active
          // With both <ul> and <nav> markup a parent is the previous sibling of any nav ancestor

          $link.parents(Selector.NAV_LIST_GROUP).prev(Selector.NAV_LINKS + ", " + Selector.LIST_ITEMS).addClass(ClassName.ACTIVE); // Handle special case when .nav-link is inside .nav-item

          $link.parents(Selector.NAV_LIST_GROUP).prev(Selector.NAV_ITEMS).children(Selector.NAV_LINKS).addClass(ClassName.ACTIVE);
        }

        $$$1(this._scrollElement).trigger(Event.ACTIVATE, {
          relatedTarget: target
        });
      };

      _proto._clear = function _clear() {
        $$$1(this._selector).filter(Selector.ACTIVE).removeClass(ClassName.ACTIVE);
      }; // Static


      ScrollSpy._jQueryInterface = function _jQueryInterface(config) {
        return this.each(function () {
          var data = $$$1(this).data(DATA_KEY);

          var _config = typeof config === 'object' && config;

          if (!data) {
            data = new ScrollSpy(this, _config);
            $$$1(this).data(DATA_KEY, data);
          }

          if (typeof config === 'string') {
            if (typeof data[config] === 'undefined') {
              throw new TypeError("No method named \"" + config + "\"");
            }

            data[config]();
          }
        });
      };

      _createClass(ScrollSpy, null, [{
        key: "VERSION",
        get: function get() {
          return VERSION;
        }
      }, {
        key: "Default",
        get: function get() {
          return Default;
        }
      }]);

      return ScrollSpy;
    }();
    /**
     * ------------------------------------------------------------------------
     * Data Api implementation
     * ------------------------------------------------------------------------
     */


    $$$1(window).on(Event.LOAD_DATA_API, function () {
      var scrollSpys = $$$1.makeArray($$$1(Selector.DATA_SPY));

      for (var i = scrollSpys.length; i--;) {
        var $spy = $$$1(scrollSpys[i]);

        ScrollSpy._jQueryInterface.call($spy, $spy.data());
      }
    });
    /**
     * ------------------------------------------------------------------------
     * jQuery
     * ------------------------------------------------------------------------
     */

    $$$1.fn[NAME] = ScrollSpy._jQueryInterface;
    $$$1.fn[NAME].Constructor = ScrollSpy;

    $$$1.fn[NAME].noConflict = function () {
      $$$1.fn[NAME] = JQUERY_NO_CONFLICT;
      return ScrollSpy._jQueryInterface;
    };

    return ScrollSpy;
  }($);

  /**
   * --------------------------------------------------------------------------
   * Bootstrap (v4.1.1): tab.js
   * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
   * --------------------------------------------------------------------------
   */

  var Tab = function ($$$1) {
    /**
     * ------------------------------------------------------------------------
     * Constants
     * ------------------------------------------------------------------------
     */
    var NAME = 'tab';
    var VERSION = '4.1.1';
    var DATA_KEY = 'bs.tab';
    var EVENT_KEY = "." + DATA_KEY;
    var DATA_API_KEY = '.data-api';
    var JQUERY_NO_CONFLICT = $$$1.fn[NAME];
    var Event = {
      HIDE: "hide" + EVENT_KEY,
      HIDDEN: "hidden" + EVENT_KEY,
      SHOW: "show" + EVENT_KEY,
      SHOWN: "shown" + EVENT_KEY,
      CLICK_DATA_API: "click" + EVENT_KEY + DATA_API_KEY
    };
    var ClassName = {
      DROPDOWN_MENU: 'dropdown-menu',
      ACTIVE: 'active',
      DISABLED: 'disabled',
      FADE: 'fade',
      SHOW: 'show'
    };
    var Selector = {
      DROPDOWN: '.dropdown',
      NAV_LIST_GROUP: '.nav, .list-group',
      ACTIVE: '.active',
      ACTIVE_UL: '> li > .active',
      DATA_TOGGLE: '[data-toggle="tab"], [data-toggle="pill"], [data-toggle="list"]',
      DROPDOWN_TOGGLE: '.dropdown-toggle',
      DROPDOWN_ACTIVE_CHILD: '> .dropdown-menu .active'
      /**
       * ------------------------------------------------------------------------
       * Class Definition
       * ------------------------------------------------------------------------
       */

    };

    var Tab =
    /*#__PURE__*/
    function () {
      function Tab(element) {
        this._element = element;
      } // Getters


      var _proto = Tab.prototype;

      // Public
      _proto.show = function show() {
        var _this = this;

        if (this._element.parentNode && this._element.parentNode.nodeType === Node.ELEMENT_NODE && $$$1(this._element).hasClass(ClassName.ACTIVE) || $$$1(this._element).hasClass(ClassName.DISABLED)) {
          return;
        }

        var target;
        var previous;
        var listElement = $$$1(this._element).closest(Selector.NAV_LIST_GROUP)[0];
        var selector = Util.getSelectorFromElement(this._element);

        if (listElement) {
          var itemSelector = listElement.nodeName === 'UL' ? Selector.ACTIVE_UL : Selector.ACTIVE;
          previous = $$$1.makeArray($$$1(listElement).find(itemSelector));
          previous = previous[previous.length - 1];
        }

        var hideEvent = $$$1.Event(Event.HIDE, {
          relatedTarget: this._element
        });
        var showEvent = $$$1.Event(Event.SHOW, {
          relatedTarget: previous
        });

        if (previous) {
          $$$1(previous).trigger(hideEvent);
        }

        $$$1(this._element).trigger(showEvent);

        if (showEvent.isDefaultPrevented() || hideEvent.isDefaultPrevented()) {
          return;
        }

        if (selector) {
          target = $$$1(selector)[0];
        }

        this._activate(this._element, listElement);

        var complete = function complete() {
          var hiddenEvent = $$$1.Event(Event.HIDDEN, {
            relatedTarget: _this._element
          });
          var shownEvent = $$$1.Event(Event.SHOWN, {
            relatedTarget: previous
          });
          $$$1(previous).trigger(hiddenEvent);
          $$$1(_this._element).trigger(shownEvent);
        };

        if (target) {
          this._activate(target, target.parentNode, complete);
        } else {
          complete();
        }
      };

      _proto.dispose = function dispose() {
        $$$1.removeData(this._element, DATA_KEY);
        this._element = null;
      }; // Private


      _proto._activate = function _activate(element, container, callback) {
        var _this2 = this;

        var activeElements;

        if (container.nodeName === 'UL') {
          activeElements = $$$1(container).find(Selector.ACTIVE_UL);
        } else {
          activeElements = $$$1(container).children(Selector.ACTIVE);
        }

        var active = activeElements[0];
        var isTransitioning = callback && active && $$$1(active).hasClass(ClassName.FADE);

        var complete = function complete() {
          return _this2._transitionComplete(element, active, callback);
        };

        if (active && isTransitioning) {
          var transitionDuration = Util.getTransitionDurationFromElement(active);
          $$$1(active).one(Util.TRANSITION_END, complete).emulateTransitionEnd(transitionDuration);
        } else {
          complete();
        }
      };

      _proto._transitionComplete = function _transitionComplete(element, active, callback) {
        if (active) {
          $$$1(active).removeClass(ClassName.SHOW + " " + ClassName.ACTIVE);
          var dropdownChild = $$$1(active.parentNode).find(Selector.DROPDOWN_ACTIVE_CHILD)[0];

          if (dropdownChild) {
            $$$1(dropdownChild).removeClass(ClassName.ACTIVE);
          }

          if (active.getAttribute('role') === 'tab') {
            active.setAttribute('aria-selected', false);
          }
        }

        $$$1(element).addClass(ClassName.ACTIVE);

        if (element.getAttribute('role') === 'tab') {
          element.setAttribute('aria-selected', true);
        }

        Util.reflow(element);
        $$$1(element).addClass(ClassName.SHOW);

        if (element.parentNode && $$$1(element.parentNode).hasClass(ClassName.DROPDOWN_MENU)) {
          var dropdownElement = $$$1(element).closest(Selector.DROPDOWN)[0];

          if (dropdownElement) {
            $$$1(dropdownElement).find(Selector.DROPDOWN_TOGGLE).addClass(ClassName.ACTIVE);
          }

          element.setAttribute('aria-expanded', true);
        }

        if (callback) {
          callback();
        }
      }; // Static


      Tab._jQueryInterface = function _jQueryInterface(config) {
        return this.each(function () {
          var $this = $$$1(this);
          var data = $this.data(DATA_KEY);

          if (!data) {
            data = new Tab(this);
            $this.data(DATA_KEY, data);
          }

          if (typeof config === 'string') {
            if (typeof data[config] === 'undefined') {
              throw new TypeError("No method named \"" + config + "\"");
            }

            data[config]();
          }
        });
      };

      _createClass(Tab, null, [{
        key: "VERSION",
        get: function get() {
          return VERSION;
        }
      }]);

      return Tab;
    }();
    /**
     * ------------------------------------------------------------------------
     * Data Api implementation
     * ------------------------------------------------------------------------
     */


    $$$1(document).on(Event.CLICK_DATA_API, Selector.DATA_TOGGLE, function (event) {
      event.preventDefault();

      Tab._jQueryInterface.call($$$1(this), 'show');
    });
    /**
     * ------------------------------------------------------------------------
     * jQuery
     * ------------------------------------------------------------------------
     */

    $$$1.fn[NAME] = Tab._jQueryInterface;
    $$$1.fn[NAME].Constructor = Tab;

    $$$1.fn[NAME].noConflict = function () {
      $$$1.fn[NAME] = JQUERY_NO_CONFLICT;
      return Tab._jQueryInterface;
    };

    return Tab;
  }($);

  /**
   * --------------------------------------------------------------------------
   * Bootstrap (v4.1.1): index.js
   * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
   * --------------------------------------------------------------------------
   */

  (function ($$$1) {
    if (typeof $$$1 === 'undefined') {
      throw new TypeError('Bootstrap\'s JavaScript requires jQuery. jQuery must be included before Bootstrap\'s JavaScript.');
    }

    var version = $$$1.fn.jquery.split(' ')[0].split('.');
    var minMajor = 1;
    var ltMajor = 2;
    var minMinor = 9;
    var minPatch = 1;
    var maxMajor = 4;

    if (version[0] < ltMajor && version[1] < minMinor || version[0] === minMajor && version[1] === minMinor && version[2] < minPatch || version[0] >= maxMajor) {
      throw new Error('Bootstrap\'s JavaScript requires at least jQuery v1.9.1 but less than v4.0.0');
    }
  })($);

  exports.Util = Util;
  exports.Alert = Alert;
  exports.Button = Button;
  exports.Carousel = Carousel;
  exports.Collapse = Collapse;
  exports.Dropdown = Dropdown;
  exports.Modal = Modal;
  exports.Popover = Popover;
  exports.Scrollspy = ScrollSpy;
  exports.Tab = Tab;
  exports.Tooltip = Tooltip;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
/*!
 * Daemonite Material v4.1.1 (http://daemonite.github.io/material/)
 * Copyright 2011-2018 Daemon Pty Ltd
 * Licensed under MIT (https://github.com/Daemonite/material/blob/master/LICENSE)
 */


(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('jquery')) :
  typeof define === 'function' && define.amd ? define(['exports', 'jquery'], factory) :
  (factory((global.material = {}),global.jQuery));
}(this, (function (exports,$) { 'use strict';

  $ = $ && $.hasOwnProperty('default') ? $['default'] : $;

  /*
   * Expansion panel plugins expands a collapsed panel in full upon selecting
   */

  var ExpansionPanel = function ($$$1) {
    // constants >>>
    var DATA_KEY = 'bs.collapse';
    var EVENT_KEY = "." + DATA_KEY;
    var ClassName = {
      SHOW: 'show',
      SHOW_PREDECESSOR: 'show-predecessor'
    };
    var Event = {
      HIDE: "hide" + EVENT_KEY,
      SHOW: "show" + EVENT_KEY
    };
    var Selector = {
      PANEL: '.expansion-panel',
      PANEL_BODY: '.expansion-panel .collapse' // <<< constants

    };
    $$$1(document).on("" + Event.HIDE, Selector.PANEL_BODY, function () {
      var target = $$$1(this).closest(Selector.PANEL);
      target.removeClass(ClassName.SHOW);
      var predecessor = target.prev(Selector.PANEL);

      if (predecessor.length) {
        predecessor.removeClass(ClassName.SHOW_PREDECESSOR);
      }
    }).on("" + Event.SHOW, Selector.PANEL_BODY, function () {
      var target = $$$1(this).closest(Selector.PANEL);
      target.addClass(ClassName.SHOW);
      var predecessor = target.prev(Selector.PANEL);

      if (predecessor.length) {
        predecessor.addClass(ClassName.SHOW_PREDECESSOR);
      }
    });
  }($);

  /*
   * Floating label plugin moves inline label to float above the field
   * when a user engages with the assosciated text input field
   */

  var FloatingLabel = function ($$$1) {
    // constants >>>
    var DATA_KEY = 'md.floatinglabel';
    var EVENT_KEY = "." + DATA_KEY;
    var NAME = 'floatinglabel';
    var NO_CONFLICT = $$$1.fn[NAME];
    var ClassName = {
      IS_FOCUSED: 'is-focused',
      HAS_VALUE: 'has-value'
    };
    var Event = {
      CHANGE: "change" + EVENT_KEY,
      FOCUSIN: "focusin" + EVENT_KEY,
      FOCUSOUT: "focusout" + EVENT_KEY
    };
    var Selector = {
      DATA_PARENT: '.floating-label',
      DATA_TOGGLE: '.floating-label .custom-select, .floating-label .form-control' // <<< constants

    };

    var FloatingLabel =
    /*#__PURE__*/
    function () {
      function FloatingLabel(element) {
        this._element = element;
        this._parent = $$$1(element).closest(Selector.DATA_PARENT)[0];
      }

      var _proto = FloatingLabel.prototype;

      _proto.change = function change() {
        if ($$$1(this._element).val() || $$$1(this._element).is('select') && $$$1('option:first-child', $$$1(this._element)).html().replace(' ', '') !== '') {
          $$$1(this._parent).addClass(ClassName.HAS_VALUE);
        } else {
          $$$1(this._parent).removeClass(ClassName.HAS_VALUE);
        }
      };

      _proto.focusin = function focusin() {
        $$$1(this._parent).addClass(ClassName.IS_FOCUSED);
      };

      _proto.focusout = function focusout() {
        $$$1(this._parent).removeClass(ClassName.IS_FOCUSED);
      };

      FloatingLabel._jQueryInterface = function _jQueryInterface(event) {
        return this.each(function () {
          var _event = event ? event : 'change';

          var data = $$$1(this).data(DATA_KEY);

          if (!data) {
            data = new FloatingLabel(this);
            $$$1(this).data(DATA_KEY, data);
          }

          if (typeof _event === 'string') {
            if (typeof data[_event] === 'undefined') {
              throw new Error("No method named \"" + _event + "\"");
            }

            data[_event]();
          }
        });
      };

      return FloatingLabel;
    }();

    $$$1(document).on(Event.CHANGE + " " + Event.FOCUSIN + " " + Event.FOCUSOUT, Selector.DATA_TOGGLE, function (event) {
      FloatingLabel._jQueryInterface.call($$$1(this), event.type);
    });
    $$$1.fn[NAME] = FloatingLabel._jQueryInterface;
    $$$1.fn[NAME].Constructor = FloatingLabel;

    $$$1.fn[NAME].noConflict = function () {
      $$$1.fn[NAME] = NO_CONFLICT;
      return FloatingLabel._jQueryInterface;
    };

    return FloatingLabel;
  }($);

  function _defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  function _createClass(Constructor, protoProps, staticProps) {
    if (protoProps) _defineProperties(Constructor.prototype, protoProps);
    if (staticProps) _defineProperties(Constructor, staticProps);
    return Constructor;
  }

  function _defineProperty(obj, key, value) {
    if (key in obj) {
      Object.defineProperty(obj, key, {
        value: value,
        enumerable: true,
        configurable: true,
        writable: true
      });
    } else {
      obj[key] = value;
    }

    return obj;
  }

  function _objectSpread(target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i] != null ? arguments[i] : {};
      var ownKeys = Object.keys(source);

      if (typeof Object.getOwnPropertySymbols === 'function') {
        ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) {
          return Object.getOwnPropertyDescriptor(source, sym).enumerable;
        }));
      }

      ownKeys.forEach(function (key) {
        _defineProperty(target, key, source[key]);
      });
    }

    return target;
  }

  /*
   * Global util js
   * Based on Bootstrap's (v4.1.X) `util.js`
   */

  var Util = function ($$$1) {
    var MAX_UID = 1000000;
    var MILLISECONDS_MULTIPLIER = 1000;
    var TRANSITION_END = 'transitionend';

    function getSpecialTransitionEndEvent() {
      return {
        bindType: TRANSITION_END,
        delegateType: TRANSITION_END,
        handle: function handle(event) {
          if ($$$1(event.target).is(this)) {
            return event.handleObj.handler.apply(this, arguments); // eslint-disable-line prefer-rest-params
          }

          return undefined; // eslint-disable-line no-undefined
        }
      };
    }

    function setTransitionEndSupport() {
      $$$1.fn.emulateTransitionEnd = transitionEndEmulator;
      $$$1.event.special[Util.TRANSITION_END] = getSpecialTransitionEndEvent();
    }

    function toType(obj) {
      return {}.toString.call(obj).match(/\s([a-z]+)/i)[1].toLowerCase();
    }

    function transitionEndEmulator(duration) {
      var _this = this;

      var called = false;
      $$$1(this).one(Util.TRANSITION_END, function () {
        called = true;
      });
      setTimeout(function () {
        if (!called) {
          Util.triggerTransitionEnd(_this);
        }
      }, duration);
      return this;
    }

    var Util = {
      TRANSITION_END: 'mdTransitionEnd',
      getSelectorFromElement: function getSelectorFromElement(element) {
        var selector = element.getAttribute('data-target');

        if (!selector || selector === '#') {
          selector = element.getAttribute('href') || '';
        }

        try {
          var $selector = $$$1(document).find(selector);
          return $selector.length > 0 ? selector : null;
        } catch (err) {
          return null;
        }
      },
      getTransitionDurationFromElement: function getTransitionDurationFromElement(element) {
        if (!element) {
          return 0;
        }

        var transitionDuration = $$$1(element).css('transition-duration');

        if (!transitionDuration) {
          return 0;
        }

        transitionDuration = transitionDuration.split(',')[0];
        return parseFloat(transitionDuration) * MILLISECONDS_MULTIPLIER;
      },
      getUID: function getUID(prefix) {
        do {
          // eslint-disable-next-line no-bitwise
          prefix += ~~(Math.random() * MAX_UID);
        } while (document.getElementById(prefix));

        return prefix;
      },
      isElement: function isElement(obj) {
        return (obj[0] || obj).nodeType;
      },
      reflow: function reflow(element) {
        return element.offsetHeight;
      },
      supportsTransitionEnd: function supportsTransitionEnd() {
        return Boolean(TRANSITION_END);
      },
      triggerTransitionEnd: function triggerTransitionEnd(element) {
        $$$1(element).trigger(TRANSITION_END);
      },
      typeCheckConfig: function typeCheckConfig(componentName, config, configTypes) {
        for (var property in configTypes) {
          if (Object.prototype.hasOwnProperty.call(configTypes, property)) {
            var expectedTypes = configTypes[property];
            var value = config[property];
            var valueType = value && Util.isElement(value) ? 'element' : toType(value);

            if (!new RegExp(expectedTypes).test(valueType)) {
              throw new Error(componentName.toUpperCase() + ": " + ("Option \"" + property + "\" provided type \"" + valueType + "\" ") + ("but expected type \"" + expectedTypes + "\"."));
            }
          }
        }
      }
    };
    setTransitionEndSupport();
    return Util;
  }($);

  /*
   * Navigation drawer plguin
   * Based on Bootstrap's (v4.1.X) `modal.js`
   */

  var NavDrawer = function ($$$1) {
    // constants >>>
    var DATA_API_KEY = '.data-api';
    var DATA_KEY = 'md.navdrawer';
    var ESCAPE_KEYCODE = 27;
    var EVENT_KEY = "." + DATA_KEY;
    var NAME = 'navdrawer';
    var NO_CONFLICT = $$$1.fn[NAME];
    var ClassName = {
      BACKDROP: 'navdrawer-backdrop',
      OPEN: 'navdrawer-open',
      SHOW: 'show'
    };
    var Default = {
      breakpoint: '',
      keyboard: true,
      show: true,
      type: 'default'
    };
    var DefaultType = {
      keyboard: 'boolean',
      show: 'boolean',
      type: 'string'
    };
    var Event = {
      CLICK_DATA_API: "click" + EVENT_KEY + DATA_API_KEY,
      CLICK_DISMISS: "click.dismiss" + EVENT_KEY,
      FOCUSIN: "focusin" + EVENT_KEY,
      HIDDEN: "hidden" + EVENT_KEY,
      HIDE: "hide" + EVENT_KEY,
      KEYDOWN_DISMISS: "keydown.dismiss" + EVENT_KEY,
      MOUSEDOWN_DISMISS: "mousedown.dismiss" + EVENT_KEY,
      MOUSEUP_DISMISS: "mouseup.dismiss" + EVENT_KEY,
      SHOW: "show" + EVENT_KEY,
      SHOWN: "shown" + EVENT_KEY
    };
    var Selector = {
      CONTENT: '.navdrawer-content',
      DATA_DISMISS: '[data-dismiss="navdrawer"]',
      DATA_TOGGLE: '[data-toggle="navdrawer"]' // <<< constants

    };

    var NavDrawer =
    /*#__PURE__*/
    function () {
      function NavDrawer(element, config) {
        this._backdrop = null;
        this._config = this._getConfig(config);
        this._content = $$$1(element).find(Selector.CONTENT)[0];
        this._element = element;
        this._ignoreBackdropClick = false;
        this._isShown = false;
        this._typeBreakpoint = this._config.breakpoint === '' ? '' : "-" + this._config.breakpoint;
      }

      var _proto = NavDrawer.prototype;

      _proto.hide = function hide(event) {
        var _this = this;

        if (event) {
          event.preventDefault();
        }

        if (this._isTransitioning || !this._isShown) {
          return;
        }

        var hideEvent = $$$1.Event(Event.HIDE);
        $$$1(this._element).trigger(hideEvent);

        if (!this._isShown || hideEvent.isDefaultPrevented()) {
          return;
        }

        this._isShown = false;
        this._isTransitioning = true;

        this._setEscapeEvent();

        $$$1(document).off(Event.FOCUSIN);
        $$$1(document.body).removeClass(ClassName.OPEN + "-" + this._config.type + this._typeBreakpoint);
        $$$1(this._element).removeClass(ClassName.SHOW);
        $$$1(this._element).off(Event.CLICK_DISMISS);
        $$$1(this._content).off(Event.MOUSEDOWN_DISMISS);
        var transitionDuration = Util.getTransitionDurationFromElement(this._content);
        $$$1(this._content).one(Util.TRANSITION_END, function (event) {
          return _this._hideNavdrawer(event);
        }).emulateTransitionEnd(transitionDuration);

        this._showBackdrop();
      };

      _proto.show = function show(relatedTarget) {
        var _this2 = this;

        if (this._isTransitioning || this._isShown) {
          return;
        }

        this._isTransitioning = true;
        var showEvent = $$$1.Event(Event.SHOW, {
          relatedTarget: relatedTarget
        });
        $$$1(this._element).trigger(showEvent);

        if (this._isShown || showEvent.isDefaultPrevented()) {
          return;
        }

        this._isShown = true;

        this._setEscapeEvent();

        $$$1(this._element).addClass(NAME + "-" + this._config.type + this._typeBreakpoint);
        $$$1(this._element).on(Event.CLICK_DISMISS, Selector.DATA_DISMISS, function (event) {
          return _this2.hide(event);
        });
        $$$1(this._content).on(Event.MOUSEDOWN_DISMISS, function () {
          $$$1(_this2._element).one(Event.MOUSEUP_DISMISS, function (event) {
            if ($$$1(event.target).is(_this2._element)) {
              _this2._ignoreBackdropClick = true;
            }
          });
        });

        this._showBackdrop();

        this._showElement(relatedTarget);
      };

      _proto.toggle = function toggle(relatedTarget) {
        return this._isShown ? this.hide() : this.show(relatedTarget);
      };

      _proto._enforceFocus = function _enforceFocus() {
        var _this3 = this;

        $$$1(document).off(Event.FOCUSIN).on(Event.FOCUSIN, function (event) {
          if (document !== event.target && _this3._element !== event.target && $$$1(_this3._element).has(event.target).length === 0) {
            _this3._element.focus();
          }
        });
      };

      _proto._getConfig = function _getConfig(config) {
        config = _objectSpread({}, Default, config);
        Util.typeCheckConfig(NAME, config, DefaultType);
        return config;
      };

      _proto._hideNavdrawer = function _hideNavdrawer() {
        this._element.style.display = 'none';

        this._element.setAttribute('aria-hidden', true);

        this._isTransitioning = false;
        $$$1(this._element).trigger(Event.HIDDEN);
      };

      _proto._removeBackdrop = function _removeBackdrop() {
        if (this._backdrop) {
          $$$1(this._backdrop).remove();
          this._backdrop = null;
        }
      };

      _proto._setEscapeEvent = function _setEscapeEvent() {
        var _this4 = this;

        if (this._isShown && this._config.keyboard) {
          $$$1(this._element).on(Event.KEYDOWN_DISMISS, function (event) {
            if (event.which === ESCAPE_KEYCODE) {
              event.preventDefault();

              _this4.hide();
            }
          });
        } else if (!this._isShown) {
          $$$1(this._element).off(Event.KEYDOWN_DISMISS);
        }
      };

      _proto._showBackdrop = function _showBackdrop() {
        var _this5 = this;

        if (this._isShown) {
          this._backdrop = document.createElement('div');
          $$$1(this._backdrop).addClass(ClassName.BACKDROP).addClass(ClassName.BACKDROP + "-" + this._config.type + this._typeBreakpoint).appendTo(document.body);
          $$$1(this._element).on(Event.CLICK_DISMISS, function (event) {
            if (_this5._ignoreBackdropClick) {
              _this5._ignoreBackdropClick = false;
              return;
            }

            if (event.target !== event.currentTarget) {
              return;
            }

            _this5.hide();
          });
          Util.reflow(this._backdrop);
          $$$1(this._backdrop).addClass(ClassName.SHOW);
        } else if (!this._isShown && this._backdrop) {
          $$$1(this._backdrop).removeClass(ClassName.SHOW);

          this._removeBackdrop();
        }
      };

      _proto._showElement = function _showElement(relatedTarget) {
        var _this6 = this;

        if (!this._element.parentNode || this._element.parentNode.nodeType !== Node.ELEMENT_NODE) {
          document.body.appendChild(this._element);
        }

        this._element.style.display = 'block';

        this._element.removeAttribute('aria-hidden');

        Util.reflow(this._element);
        $$$1(document.body).addClass(ClassName.OPEN + "-" + this._config.type + this._typeBreakpoint);
        $$$1(this._element).addClass(ClassName.SHOW);

        this._enforceFocus();

        var shownEvent = $$$1.Event(Event.SHOWN, {
          relatedTarget: relatedTarget
        });

        var transitionComplete = function transitionComplete() {
          _this6._element.focus();

          _this6._isTransitioning = false;
          $$$1(_this6._element).trigger(shownEvent);
        };

        var transitionDuration = Util.getTransitionDurationFromElement(this._content);
        $$$1(this._content).one(Util.TRANSITION_END, transitionComplete).emulateTransitionEnd(transitionDuration);
      };

      NavDrawer._jQueryInterface = function _jQueryInterface(config, relatedTarget) {
        return this.each(function () {
          var _config = _objectSpread({}, Default, $$$1(this).data(), typeof config === 'object' && config ? config : {});

          var data = $$$1(this).data(DATA_KEY);

          if (!data) {
            data = new NavDrawer(this, _config);
            $$$1(this).data(DATA_KEY, data);
          }

          if (typeof config === 'string') {
            if (typeof data[config] === 'undefined') {
              throw new TypeError("No method named \"" + config + "\"");
            }

            data[config](relatedTarget);
          } else if (_config.show) {
            data.show(relatedTarget);
          }
        });
      };

      _createClass(NavDrawer, null, [{
        key: "Default",
        get: function get() {
          return Default;
        }
      }]);

      return NavDrawer;
    }();

    $$$1(document).on(Event.CLICK_DATA_API, Selector.DATA_TOGGLE, function (event) {
      var _this7 = this;

      var selector = Util.getSelectorFromElement(this);
      var target;

      if (selector) {
        target = $$$1(selector)[0];
      }

      var config = $$$1(target).data(DATA_KEY) ? 'toggle' : _objectSpread({}, $$$1(target).data(), $$$1(this).data());

      if (this.tagName === 'A' || this.tagName === 'AREA') {
        event.preventDefault();
      }

      var $target = $$$1(target).one(Event.SHOW, function (showEvent) {
        if (showEvent.isDefaultPrevented()) {
          return;
        }

        $target.one(Event.HIDDEN, function () {
          if ($$$1(_this7).is(':visible')) {
            _this7.focus();
          }
        });
      });

      NavDrawer._jQueryInterface.call($$$1(target), config, this);
    });
    $$$1.fn[NAME] = NavDrawer._jQueryInterface;
    $$$1.fn[NAME].Constructor = NavDrawer;

    $$$1.fn[NAME].noConflict = function () {
      $$$1.fn[NAME] = NO_CONFLICT;
      return NavDrawer._jQueryInterface;
    };

    return NavDrawer;
  }($);

  function createCommonjsModule(fn, module) {
  	return module = { exports: {} }, fn(module, module.exports), module.exports;
  }

  var picker = createCommonjsModule(function (module, exports) {
  /*!
   * pickadate.js v3.5.6, 2015/04/20
   * By Amsul, http://amsul.ca
   * Hosted on http://amsul.github.io/pickadate.js
   * Licensed under MIT
   */

  (function ( factory ) {

      // AMD.
      if ( typeof undefined == 'function' && undefined.amd )
          undefined( 'picker', ['jquery'], factory );

      // Node.js/browserify.
      else module.exports = factory( $ );

  }(function( $$$1 ) {

  var $window = $$$1( window );
  var $document = $$$1( document );
  var $html = $$$1( document.documentElement );
  var supportsTransitions = document.documentElement.style.transition != null;


  /**
   * The picker constructor that creates a blank picker.
   */
  function PickerConstructor( ELEMENT, NAME, COMPONENT, OPTIONS ) {

      // If there’s no element, return the picker constructor.
      if ( !ELEMENT ) return PickerConstructor


      var
          IS_DEFAULT_THEME = false,


          // The state of the picker.
          STATE = {
              id: ELEMENT.id || 'P' + Math.abs( ~~(Math.random() * new Date()) )
          },


          // Merge the defaults and options passed.
          SETTINGS = COMPONENT ? $$$1.extend( true, {}, COMPONENT.defaults, OPTIONS ) : OPTIONS || {},


          // Merge the default classes with the settings classes.
          CLASSES = $$$1.extend( {}, PickerConstructor.klasses(), SETTINGS.klass ),


          // The element node wrapper into a jQuery object.
          $ELEMENT = $$$1( ELEMENT ),


          // Pseudo picker constructor.
          PickerInstance = function() {
              return this.start()
          },


          // The picker prototype.
          P = PickerInstance.prototype = {

              constructor: PickerInstance,

              $node: $ELEMENT,


              /**
               * Initialize everything
               */
              start: function() {

                  // If it’s already started, do nothing.
                  if ( STATE && STATE.start ) return P


                  // Update the picker states.
                  STATE.methods = {};
                  STATE.start = true;
                  STATE.open = false;
                  STATE.type = ELEMENT.type;


                  // Confirm focus state, convert into text input to remove UA stylings,
                  // and set as readonly to prevent keyboard popup.
                  ELEMENT.autofocus = ELEMENT == getActiveElement();
                  ELEMENT.readOnly = !SETTINGS.editable;
                  ELEMENT.id = ELEMENT.id || STATE.id;
                  if ( ELEMENT.type != 'text' ) {
                      ELEMENT.type = 'text';
                  }


                  // Create a new picker component with the settings.
                  P.component = new COMPONENT(P, SETTINGS);


                  // Create the picker root and then prepare it.
                  P.$root = $$$1( '<div class="' + CLASSES.picker + '" id="' + ELEMENT.id + '_root" />' );
                  prepareElementRoot();


                  // Create the picker holder and then prepare it.
                  P.$holder = $$$1( createWrappedComponent() ).appendTo( P.$root );
                  prepareElementHolder();


                  // If there’s a format for the hidden input element, create the element.
                  if ( SETTINGS.formatSubmit ) {
                      prepareElementHidden();
                  }


                  // Prepare the input element.
                  prepareElement();


                  // Insert the hidden input as specified in the settings.
                  if ( SETTINGS.containerHidden ) $$$1( SETTINGS.containerHidden ).append( P._hidden );
                  else $ELEMENT.after( P._hidden );


                  // Insert the root as specified in the settings.
                  if ( SETTINGS.container ) $$$1( SETTINGS.container ).append( P.$root );
                  else $ELEMENT.after( P.$root );


                  // Bind the default component and settings events.
                  P.on({
                      start: P.component.onStart,
                      render: P.component.onRender,
                      stop: P.component.onStop,
                      open: P.component.onOpen,
                      close: P.component.onClose,
                      set: P.component.onSet
                  }).on({
                      start: SETTINGS.onStart,
                      render: SETTINGS.onRender,
                      stop: SETTINGS.onStop,
                      open: SETTINGS.onOpen,
                      close: SETTINGS.onClose,
                      set: SETTINGS.onSet
                  });


                  // Once we’re all set, check the theme in use.
                  IS_DEFAULT_THEME = isUsingDefaultTheme( P.$holder[0] );


                  // If the element has autofocus, open the picker.
                  if ( ELEMENT.autofocus ) {
                      P.open();
                  }


                  // Trigger queued the “start” and “render” events.
                  return P.trigger( 'start' ).trigger( 'render' )
              }, //start


              /**
               * Render a new picker
               */
              render: function( entireComponent ) {

                  // Insert a new component holder in the root or box.
                  if ( entireComponent ) {
                      P.$holder = $$$1( createWrappedComponent() );
                      prepareElementHolder();
                      P.$root.html( P.$holder );
                  }
                  else P.$root.find( '.' + CLASSES.box ).html( P.component.nodes( STATE.open ) );

                  // Trigger the queued “render” events.
                  return P.trigger( 'render' )
              }, //render


              /**
               * Destroy everything
               */
              stop: function() {

                  // If it’s already stopped, do nothing.
                  if ( !STATE.start ) return P

                  // Then close the picker.
                  P.close();

                  // Remove the hidden field.
                  if ( P._hidden ) {
                      P._hidden.parentNode.removeChild( P._hidden );
                  }

                  // Remove the root.
                  P.$root.remove();

                  // Remove the input class, remove the stored data, and unbind
                  // the events (after a tick for IE - see `P.close`).
                  $ELEMENT.removeClass( CLASSES.input ).removeData( NAME );
                  setTimeout( function() {
                      $ELEMENT.off( '.' + STATE.id );
                  }, 0);

                  // Restore the element state
                  ELEMENT.type = STATE.type;
                  ELEMENT.readOnly = false;

                  // Trigger the queued “stop” events.
                  P.trigger( 'stop' );

                  // Reset the picker states.
                  STATE.methods = {};
                  STATE.start = false;

                  return P
              }, //stop


              /**
               * Open up the picker
               */
              open: function( dontGiveFocus ) {

                  // If it’s already open, do nothing.
                  if ( STATE.open ) return P

                  // Add the “active” class.
                  $ELEMENT.addClass( CLASSES.active );
                  aria( ELEMENT, 'expanded', true );

                  // * A Firefox bug, when `html` has `overflow:hidden`, results in
                  //   killing transitions :(. So add the “opened” state on the next tick.
                  //   Bug: https://bugzilla.mozilla.org/show_bug.cgi?id=625289
                  setTimeout( function() {

                      // Add the “opened” class to the picker root.
                      P.$root.addClass( CLASSES.opened );
                      aria( P.$root[0], 'hidden', false );

                  }, 0 );

                  // If we have to give focus, bind the element and doc events.
                  if ( dontGiveFocus !== false ) {

                      // Set it as open.
                      STATE.open = true;

                      // Prevent the page from scrolling.
                      if ( IS_DEFAULT_THEME ) {
                          $html.
                              css( 'overflow', 'hidden' ).
                              css( 'padding-right', '+=' + getScrollbarWidth() );
                      }

                      // Pass focus to the root element’s jQuery object.
                      focusPickerOnceOpened();

                      // Bind the document events.
                      $document.on( 'click.' + STATE.id + ' focusin.' + STATE.id, function( event ) {

                          var target = event.target;

                          // If the target of the event is not the element, close the picker picker.
                          // * Don’t worry about clicks or focusins on the root because those don’t bubble up.
                          //   Also, for Firefox, a click on an `option` element bubbles up directly
                          //   to the doc. So make sure the target wasn't the doc.
                          // * In Firefox stopPropagation() doesn’t prevent right-click events from bubbling,
                          //   which causes the picker to unexpectedly close when right-clicking it. So make
                          //   sure the event wasn’t a right-click.
                          if ( target != ELEMENT && target != document && event.which != 3 ) {

                              // If the target was the holder that covers the screen,
                              // keep the element focused to maintain tabindex.
                              P.close( target === P.$holder[0] );
                          }

                      }).on( 'keydown.' + STATE.id, function( event ) {

                          var
                              // Get the keycode.
                              keycode = event.keyCode,

                              // Translate that to a selection change.
                              keycodeToMove = P.component.key[ keycode ],

                              // Grab the target.
                              target = event.target;


                          // On escape, close the picker and give focus.
                          if ( keycode == 27 ) {
                              P.close( true );
                          }


                          // Check if there is a key movement or “enter” keypress on the element.
                          else if ( target == P.$holder[0] && ( keycodeToMove || keycode == 13 ) ) {

                              // Prevent the default action to stop page movement.
                              event.preventDefault();

                              // Trigger the key movement action.
                              if ( keycodeToMove ) {
                                  PickerConstructor._.trigger( P.component.key.go, P, [ PickerConstructor._.trigger( keycodeToMove ) ] );
                              }

                              // On “enter”, if the highlighted item isn’t disabled, set the value and close.
                              else if ( !P.$root.find( '.' + CLASSES.highlighted ).hasClass( CLASSES.disabled ) ) {
                                  P.set( 'select', P.component.item.highlight );
                                  if ( SETTINGS.closeOnSelect ) {
                                      P.close( true );
                                  }
                              }
                          }


                          // If the target is within the root and “enter” is pressed,
                          // prevent the default action and trigger a click on the target instead.
                          else if ( $$$1.contains( P.$root[0], target ) && keycode == 13 ) {
                              event.preventDefault();
                              target.click();
                          }
                      });
                  }

                  // Trigger the queued “open” events.
                  return P.trigger( 'open' )
              }, //open


              /**
               * Close the picker
               */
              close: function( giveFocus ) {

                  // If we need to give focus, do it before changing states.
                  if ( giveFocus ) {
                      if ( SETTINGS.editable ) {
                          ELEMENT.focus();
                      }
                      else {
                          // ....ah yes! It would’ve been incomplete without a crazy workaround for IE :|
                          // The focus is triggered *after* the close has completed - causing it
                          // to open again. So unbind and rebind the event at the next tick.
                          P.$holder.off( 'focus.toOpen' ).focus();
                          setTimeout( function() {
                              P.$holder.on( 'focus.toOpen', handleFocusToOpenEvent );
                          }, 0 );
                      }
                  }

                  // Remove the “active” class.
                  $ELEMENT.removeClass( CLASSES.active );
                  aria( ELEMENT, 'expanded', false );

                  // * A Firefox bug, when `html` has `overflow:hidden`, results in
                  //   killing transitions :(. So remove the “opened” state on the next tick.
                  //   Bug: https://bugzilla.mozilla.org/show_bug.cgi?id=625289
                  setTimeout( function() {

                      // Remove the “opened” and “focused” class from the picker root.
                      P.$root.removeClass( CLASSES.opened + ' ' + CLASSES.focused );
                      aria( P.$root[0], 'hidden', true );

                  }, 0 );

                  // If it’s already closed, do nothing more.
                  if ( !STATE.open ) return P

                  // Set it as closed.
                  STATE.open = false;

                  // Allow the page to scroll.
                  if ( IS_DEFAULT_THEME ) {
                      $html.
                          css( 'overflow', '' ).
                          css( 'padding-right', '-=' + getScrollbarWidth() );
                  }

                  // Unbind the document events.
                  $document.off( '.' + STATE.id );

                  // Trigger the queued “close” events.
                  return P.trigger( 'close' )
              }, //close


              /**
               * Clear the values
               */
              clear: function( options ) {
                  return P.set( 'clear', null, options )
              }, //clear


              /**
               * Set something
               */
              set: function( thing, value, options ) {

                  var thingItem, thingValue,
                      thingIsObject = $$$1.isPlainObject( thing ),
                      thingObject = thingIsObject ? thing : {};

                  // Make sure we have usable options.
                  options = thingIsObject && $$$1.isPlainObject( value ) ? value : options || {};

                  if ( thing ) {

                      // If the thing isn’t an object, make it one.
                      if ( !thingIsObject ) {
                          thingObject[ thing ] = value;
                      }

                      // Go through the things of items to set.
                      for ( thingItem in thingObject ) {

                          // Grab the value of the thing.
                          thingValue = thingObject[ thingItem ];

                          // First, if the item exists and there’s a value, set it.
                          if ( thingItem in P.component.item ) {
                              if ( thingValue === undefined ) thingValue = null;
                              P.component.set( thingItem, thingValue, options );
                          }

                          // Then, check to update the element value and broadcast a change.
                          if ( thingItem == 'select' || thingItem == 'clear' ) {
                              $ELEMENT.
                                  val( thingItem == 'clear' ? '' : P.get( thingItem, SETTINGS.format ) ).
                                  trigger( 'change' );
                          }
                      }

                      // Render a new picker.
                      P.render();
                  }

                  // When the method isn’t muted, trigger queued “set” events and pass the `thingObject`.
                  return options.muted ? P : P.trigger( 'set', thingObject )
              }, //set


              /**
               * Get something
               */
              get: function( thing, format ) {

                  // Make sure there’s something to get.
                  thing = thing || 'value';

                  // If a picker state exists, return that.
                  if ( STATE[ thing ] != null ) {
                      return STATE[ thing ]
                  }

                  // Return the submission value, if that.
                  if ( thing == 'valueSubmit' ) {
                      if ( P._hidden ) {
                          return P._hidden.value
                      }
                      thing = 'value';
                  }

                  // Return the value, if that.
                  if ( thing == 'value' ) {
                      return ELEMENT.value
                  }

                  // Check if a component item exists, return that.
                  if ( thing in P.component.item ) {
                      if ( typeof format == 'string' ) {
                          var thingValue = P.component.get( thing );
                          return thingValue ?
                              PickerConstructor._.trigger(
                                  P.component.formats.toString,
                                  P.component,
                                  [ format, thingValue ]
                              ) : ''
                      }
                      return P.component.get( thing )
                  }
              }, //get



              /**
               * Bind events on the things.
               */
              on: function( thing, method, internal ) {

                  var thingName, thingMethod,
                      thingIsObject = $$$1.isPlainObject( thing ),
                      thingObject = thingIsObject ? thing : {};

                  if ( thing ) {

                      // If the thing isn’t an object, make it one.
                      if ( !thingIsObject ) {
                          thingObject[ thing ] = method;
                      }

                      // Go through the things to bind to.
                      for ( thingName in thingObject ) {

                          // Grab the method of the thing.
                          thingMethod = thingObject[ thingName ];

                          // If it was an internal binding, prefix it.
                          if ( internal ) {
                              thingName = '_' + thingName;
                          }

                          // Make sure the thing methods collection exists.
                          STATE.methods[ thingName ] = STATE.methods[ thingName ] || [];

                          // Add the method to the relative method collection.
                          STATE.methods[ thingName ].push( thingMethod );
                      }
                  }

                  return P
              }, //on



              /**
               * Unbind events on the things.
               */
              off: function() {
                  var i, thingName,
                      names = arguments;
                  for ( i = 0, namesCount = names.length; i < namesCount; i += 1 ) {
                      thingName = names[i];
                      if ( thingName in STATE.methods ) {
                          delete STATE.methods[thingName];
                      }
                  }
                  return P
              },


              /**
               * Fire off method events.
               */
              trigger: function( name, data ) {
                  var _trigger = function( name ) {
                      var methodList = STATE.methods[ name ];
                      if ( methodList ) {
                          methodList.map( function( method ) {
                              PickerConstructor._.trigger( method, P, [ data ] );
                          });
                      }
                  };
                  _trigger( '_' + name );
                  _trigger( name );
                  return P
              } //trigger
          }; //PickerInstance.prototype


      /**
       * Wrap the picker holder components together.
       */
      function createWrappedComponent() {

          // Create a picker wrapper holder
          return PickerConstructor._.node( 'div',

              // Create a picker wrapper node
              PickerConstructor._.node( 'div',

                  // Create a picker frame
                  PickerConstructor._.node( 'div',

                      // Create a picker box node
                      PickerConstructor._.node( 'div',

                          // Create the components nodes.
                          P.component.nodes( STATE.open ),

                          // The picker box class
                          CLASSES.box
                      ),

                      // Picker wrap class
                      CLASSES.wrap
                  ),

                  // Picker frame class
                  CLASSES.frame
              ),

              // Picker holder class
              CLASSES.holder,

              'tabindex="-1"'
          ) //endreturn
      } //createWrappedComponent



      /**
       * Prepare the input element with all bindings.
       */
      function prepareElement() {

          $ELEMENT.

              // Store the picker data by component name.
              data(NAME, P).

              // Add the “input” class name.
              addClass(CLASSES.input).

              // If there’s a `data-value`, update the value of the element.
              val( $ELEMENT.data('value') ?
                  P.get('select', SETTINGS.format) :
                  ELEMENT.value
              );


          // Only bind keydown events if the element isn’t editable.
          if ( !SETTINGS.editable ) {

              $ELEMENT.

                  // On focus/click, open the picker.
                  on( 'focus.' + STATE.id + ' click.' + STATE.id, function(event) {
                      event.preventDefault();
                      P.open();
                  }).

                  // Handle keyboard event based on the picker being opened or not.
                  on( 'keydown.' + STATE.id, handleKeydownEvent );
          }


          // Update the aria attributes.
          aria(ELEMENT, {
              haspopup: true,
              expanded: false,
              readonly: false,
              owns: ELEMENT.id + '_root'
          });
      }


      /**
       * Prepare the root picker element with all bindings.
       */
      function prepareElementRoot() {
          aria( P.$root[0], 'hidden', true );
      }


       /**
        * Prepare the holder picker element with all bindings.
        */
      function prepareElementHolder() {

          P.$holder.

              on({

                  // For iOS8.
                  keydown: handleKeydownEvent,

                  'focus.toOpen': handleFocusToOpenEvent,

                  blur: function() {
                      // Remove the “target” class.
                      $ELEMENT.removeClass( CLASSES.target );
                  },

                  // When something within the holder is focused, stop from bubbling
                  // to the doc and remove the “focused” state from the root.
                  focusin: function( event ) {
                      P.$root.removeClass( CLASSES.focused );
                      event.stopPropagation();
                  },

                  // When something within the holder is clicked, stop it
                  // from bubbling to the doc.
                  'mousedown click': function( event ) {

                      var target = event.target;

                      // Make sure the target isn’t the root holder so it can bubble up.
                      if ( target != P.$holder[0] ) {

                          event.stopPropagation();

                          // * For mousedown events, cancel the default action in order to
                          //   prevent cases where focus is shifted onto external elements
                          //   when using things like jQuery mobile or MagnificPopup (ref: #249 & #120).
                          //   Also, for Firefox, don’t prevent action on the `option` element.
                          if ( event.type == 'mousedown' && !$$$1( target ).is( 'input, select, textarea, button, option' )) {

                              event.preventDefault();

                              // Re-focus onto the holder so that users can click away
                              // from elements focused within the picker.
                              P.$holder[0].focus();
                          }
                      }
                  }

              }).

              // If there’s a click on an actionable element, carry out the actions.
              on( 'click', '[data-pick], [data-nav], [data-clear], [data-close]', function() {

                  var $target = $$$1( this ),
                      targetData = $target.data(),
                      targetDisabled = $target.hasClass( CLASSES.navDisabled ) || $target.hasClass( CLASSES.disabled ),

                      // * For IE, non-focusable elements can be active elements as well
                      //   (http://stackoverflow.com/a/2684561).
                      activeElement = getActiveElement();
                      activeElement = activeElement && ( activeElement.type || activeElement.href );

                  // If it’s disabled or nothing inside is actively focused, re-focus the element.
                  if ( targetDisabled || activeElement && !$$$1.contains( P.$root[0], activeElement ) ) {
                      P.$holder[0].focus();
                  }

                  // If something is superficially changed, update the `highlight` based on the `nav`.
                  if ( !targetDisabled && targetData.nav ) {
                      P.set( 'highlight', P.component.item.highlight, { nav: targetData.nav } );
                  }

                  // If something is picked, set `select` then close with focus.
                  else if ( !targetDisabled && 'pick' in targetData ) {
                      P.set( 'select', targetData.pick );
                      if ( SETTINGS.closeOnSelect ) {
                          P.close( true );
                      }
                  }

                  // If a “clear” button is pressed, empty the values and close with focus.
                  else if ( targetData.clear ) {
                      P.clear();
                      if ( SETTINGS.closeOnClear ) {
                          P.close( true );
                      }
                  }

                  else if ( targetData.close ) {
                      P.close( true );
                  }

              }); //P.$holder

      }


       /**
        * Prepare the hidden input element along with all bindings.
        */
      function prepareElementHidden() {

          var name;

          if ( SETTINGS.hiddenName === true ) {
              name = ELEMENT.name;
              ELEMENT.name = '';
          }
          else {
              name = [
                  typeof SETTINGS.hiddenPrefix == 'string' ? SETTINGS.hiddenPrefix : '',
                  typeof SETTINGS.hiddenSuffix == 'string' ? SETTINGS.hiddenSuffix : '_submit'
              ];
              name = name[0] + ELEMENT.name + name[1];
          }

          P._hidden = $$$1(
              '<input ' +
              'type=hidden ' +

              // Create the name using the original input’s with a prefix and suffix.
              'name="' + name + '"' +

              // If the element has a value, set the hidden value as well.
              (
                  $ELEMENT.data('value') || ELEMENT.value ?
                      ' value="' + P.get('select', SETTINGS.formatSubmit) + '"' :
                      ''
              ) +
              '>'
          )[0];

          $ELEMENT.

              // If the value changes, update the hidden input with the correct format.
              on('change.' + STATE.id, function() {
                  P._hidden.value = ELEMENT.value ?
                      P.get('select', SETTINGS.formatSubmit) :
                      '';
              });
      }


      // Wait for transitions to end before focusing the holder. Otherwise, while
      // using the `container` option, the view jumps to the container.
      function focusPickerOnceOpened() {

          if (IS_DEFAULT_THEME && supportsTransitions) {
              P.$holder.find('.' + CLASSES.frame).one('transitionend', function() {
                  P.$holder[0].focus();
              });
          }
          else {
              P.$holder[0].focus();
          }
      }


      function handleFocusToOpenEvent(event) {

          // Stop the event from propagating to the doc.
          event.stopPropagation();

          // Add the “target” class.
          $ELEMENT.addClass( CLASSES.target );

          // Add the “focused” class to the root.
          P.$root.addClass( CLASSES.focused );

          // And then finally open the picker.
          P.open();
      }


      // For iOS8.
      function handleKeydownEvent( event ) {

          var keycode = event.keyCode,

              // Check if one of the delete keys was pressed.
              isKeycodeDelete = /^(8|46)$/.test(keycode);

          // For some reason IE clears the input value on “escape”.
          if ( keycode == 27 ) {
              P.close( true );
              return false
          }

          // Check if `space` or `delete` was pressed or the picker is closed with a key movement.
          if ( keycode == 32 || isKeycodeDelete || !STATE.open && P.component.key[keycode] ) {

              // Prevent it from moving the page and bubbling to doc.
              event.preventDefault();
              event.stopPropagation();

              // If `delete` was pressed, clear the values and close the picker.
              // Otherwise open the picker.
              if ( isKeycodeDelete ) { P.clear().close(); }
              else { P.open(); }
          }
      }


      // Return a new picker instance.
      return new PickerInstance()
  } //PickerConstructor



  /**
   * The default classes and prefix to use for the HTML classes.
   */
  PickerConstructor.klasses = function( prefix ) {
      prefix = prefix || 'picker';
      return {

          picker: prefix,
          opened: prefix + '--opened',
          focused: prefix + '--focused',

          input: prefix + '__input',
          active: prefix + '__input--active',
          target: prefix + '__input--target',

          holder: prefix + '__holder',

          frame: prefix + '__frame',
          wrap: prefix + '__wrap',

          box: prefix + '__box'
      }
  }; //PickerConstructor.klasses



  /**
   * Check if the default theme is being used.
   */
  function isUsingDefaultTheme( element ) {

      var theme,
          prop = 'position';

      // For IE.
      if ( element.currentStyle ) {
          theme = element.currentStyle[prop];
      }

      // For normal browsers.
      else if ( window.getComputedStyle ) {
          theme = getComputedStyle( element )[prop];
      }

      return theme == 'fixed'
  }



  /**
   * Get the width of the browser’s scrollbar.
   * Taken from: https://github.com/VodkaBears/Remodal/blob/master/src/jquery.remodal.js
   */
  function getScrollbarWidth() {

      if ( $html.height() <= $window.height() ) {
          return 0
      }

      var $outer = $$$1( '<div style="visibility:hidden;width:100px" />' ).
          appendTo( 'body' );

      // Get the width without scrollbars.
      var widthWithoutScroll = $outer[0].offsetWidth;

      // Force adding scrollbars.
      $outer.css( 'overflow', 'scroll' );

      // Add the inner div.
      var $inner = $$$1( '<div style="width:100%" />' ).appendTo( $outer );

      // Get the width with scrollbars.
      var widthWithScroll = $inner[0].offsetWidth;

      // Remove the divs.
      $outer.remove();

      // Return the difference between the widths.
      return widthWithoutScroll - widthWithScroll
  }



  /**
   * PickerConstructor helper methods.
   */
  PickerConstructor._ = {

      /**
       * Create a group of nodes. Expects:
       * `
          {
              min:    {Integer},
              max:    {Integer},
              i:      {Integer},
              node:   {String},
              item:   {Function}
          }
       * `
       */
      group: function( groupObject ) {

          var
              // Scope for the looped object
              loopObjectScope,

              // Create the nodes list
              nodesList = '',

              // The counter starts from the `min`
              counter = PickerConstructor._.trigger( groupObject.min, groupObject );


          // Loop from the `min` to `max`, incrementing by `i`
          for ( ; counter <= PickerConstructor._.trigger( groupObject.max, groupObject, [ counter ] ); counter += groupObject.i ) {

              // Trigger the `item` function within scope of the object
              loopObjectScope = PickerConstructor._.trigger( groupObject.item, groupObject, [ counter ] );

              // Splice the subgroup and create nodes out of the sub nodes
              nodesList += PickerConstructor._.node(
                  groupObject.node,
                  loopObjectScope[ 0 ],   // the node
                  loopObjectScope[ 1 ],   // the classes
                  loopObjectScope[ 2 ]    // the attributes
              );
          }

          // Return the list of nodes
          return nodesList
      }, //group


      /**
       * Create a dom node string
       */
      node: function( wrapper, item, klass, attribute ) {

          // If the item is false-y, just return an empty string
          if ( !item ) return ''

          // If the item is an array, do a join
          item = $$$1.isArray( item ) ? item.join( '' ) : item;

          // Check for the class
          klass = klass ? ' class="' + klass + '"' : '';

          // Check for any attributes
          attribute = attribute ? ' ' + attribute : '';

          // Return the wrapped item
          return '<' + wrapper + klass + attribute + '>' + item + '</' + wrapper + '>'
      }, //node


      /**
       * Lead numbers below 10 with a zero.
       */
      lead: function( number ) {
          return ( number < 10 ? '0': '' ) + number
      },


      /**
       * Trigger a function otherwise return the value.
       */
      trigger: function( callback, scope, args ) {
          return typeof callback == 'function' ? callback.apply( scope, args || [] ) : callback
      },


      /**
       * If the second character is a digit, length is 2 otherwise 1.
       */
      digits: function( string ) {
          return ( /\d/ ).test( string[ 1 ] ) ? 2 : 1
      },


      /**
       * Tell if something is a date object.
       */
      isDate: function( value ) {
          return {}.toString.call( value ).indexOf( 'Date' ) > -1 && this.isInteger( value.getDate() )
      },


      /**
       * Tell if something is an integer.
       */
      isInteger: function( value ) {
          return {}.toString.call( value ).indexOf( 'Number' ) > -1 && value % 1 === 0
      },


      /**
       * Create ARIA attribute strings.
       */
      ariaAttr: ariaAttr
  }; //PickerConstructor._



  /**
   * Extend the picker with a component and defaults.
   */
  PickerConstructor.extend = function( name, Component ) {

      // Extend jQuery.
      $$$1.fn[ name ] = function( options, action ) {

          // Grab the component data.
          var componentData = this.data( name );

          // If the picker is requested, return the data object.
          if ( options == 'picker' ) {
              return componentData
          }

          // If the component data exists and `options` is a string, carry out the action.
          if ( componentData && typeof options == 'string' ) {
              return PickerConstructor._.trigger( componentData[ options ], componentData, [ action ] )
          }

          // Otherwise go through each matched element and if the component
          // doesn’t exist, create a new picker using `this` element
          // and merging the defaults and options with a deep copy.
          return this.each( function() {
              var $this = $$$1( this );
              if ( !$this.data( name ) ) {
                  new PickerConstructor( this, name, Component, options );
              }
          })
      };

      // Set the defaults.
      $$$1.fn[ name ].defaults = Component.defaults;
  }; //PickerConstructor.extend



  function aria(element, attribute, value) {
      if ( $$$1.isPlainObject(attribute) ) {
          for ( var key in attribute ) {
              ariaSet(element, key, attribute[key]);
          }
      }
      else {
          ariaSet(element, attribute, value);
      }
  }
  function ariaSet(element, attribute, value) {
      element.setAttribute(
          (attribute == 'role' ? '' : 'aria-') + attribute,
          value
      );
  }
  function ariaAttr(attribute, data) {
      if ( !$$$1.isPlainObject(attribute) ) {
          attribute = { attribute: data };
      }
      data = '';
      for ( var key in attribute ) {
          var attr = (key == 'role' ? '' : 'aria-') + key,
              attrVal = attribute[key];
          data += attrVal == null ? '' : attr + '="' + attribute[key] + '"';
      }
      return data
  }

  // IE8 bug throws an error for activeElements within iframes.
  function getActiveElement() {
      try {
          return document.activeElement
      } catch ( err ) { }
  }



  // Expose the picker constructor.
  return PickerConstructor


  }));
  });

  var picker$1 = /*#__PURE__*/Object.freeze({
    default: picker,
    __moduleExports: picker
  });

  var require$$0 = ( picker$1 && picker ) || picker$1;

  var picker_date = createCommonjsModule(function (module, exports) {
  /*!
   * Date picker for pickadate.js v3.5.6
   * http://amsul.github.io/pickadate.js/date.htm
   */

  (function ( factory ) {

      // AMD.
      if ( typeof undefined == 'function' && undefined.amd )
          undefined( ['picker', 'jquery'], factory );

      // Node.js/browserify.
      else module.exports = factory( require$$0, $ );

  }(function( Picker, $$$1 ) {


  /**
   * Globals and constants
   */
  var DAYS_IN_WEEK = 7,
      WEEKS_IN_CALENDAR = 6,
      _ = Picker._;



  /**
   * The date picker constructor
   */
  function DatePicker( picker, settings ) {

      var calendar = this,
          element = picker.$node[ 0 ],
          elementValue = element.value,
          elementDataValue = picker.$node.data( 'value' ),
          valueString = elementDataValue || elementValue,
          formatString = elementDataValue ? settings.formatSubmit : settings.format,
          isRTL = function() {

              return element.currentStyle ?

                  // For IE.
                  element.currentStyle.direction == 'rtl' :

                  // For normal browsers.
                  getComputedStyle( picker.$root[0] ).direction == 'rtl'
          };

      calendar.settings = settings;
      calendar.$node = picker.$node;

      // The queue of methods that will be used to build item objects.
      calendar.queue = {
          min: 'measure create',
          max: 'measure create',
          now: 'now create',
          select: 'parse create validate',
          highlight: 'parse navigate create validate',
          view: 'parse create validate viewset',
          disable: 'deactivate',
          enable: 'activate'
      };

      // The component's item object.
      calendar.item = {};

      calendar.item.clear = null;
      calendar.item.disable = ( settings.disable || [] ).slice( 0 );
      calendar.item.enable = -(function( collectionDisabled ) {
          return collectionDisabled[ 0 ] === true ? collectionDisabled.shift() : -1
      })( calendar.item.disable );

      calendar.
          set( 'min', settings.min ).
          set( 'max', settings.max ).
          set( 'now' );

      // When there’s a value, set the `select`, which in turn
      // also sets the `highlight` and `view`.
      if ( valueString ) {
          calendar.set( 'select', valueString, {
              format: formatString,
              defaultValue: true
          });
      }

      // If there’s no value, default to highlighting “today”.
      else {
          calendar.
              set( 'select', null ).
              set( 'highlight', calendar.item.now );
      }


      // The keycode to movement mapping.
      calendar.key = {
          40: 7, // Down
          38: -7, // Up
          39: function() { return isRTL() ? -1 : 1 }, // Right
          37: function() { return isRTL() ? 1 : -1 }, // Left
          go: function( timeChange ) {
              var highlightedObject = calendar.item.highlight,
                  targetDate = new Date( highlightedObject.year, highlightedObject.month, highlightedObject.date + timeChange );
              calendar.set(
                  'highlight',
                  targetDate,
                  { interval: timeChange }
              );
              this.render();
          }
      };


      // Bind some picker events.
      picker.
          on( 'render', function() {
              picker.$root.find( '.' + settings.klass.selectMonth ).on( 'change', function() {
                  var value = this.value;
                  if ( value ) {
                      picker.set( 'highlight', [ picker.get( 'view' ).year, value, picker.get( 'highlight' ).date ] );
                      picker.$root.find( '.' + settings.klass.selectMonth ).trigger( 'focus' );
                  }
              });
              picker.$root.find( '.' + settings.klass.selectYear ).on( 'change', function() {
                  var value = this.value;
                  if ( value ) {
                      picker.set( 'highlight', [ value, picker.get( 'view' ).month, picker.get( 'highlight' ).date ] );
                      picker.$root.find( '.' + settings.klass.selectYear ).trigger( 'focus' );
                  }
              });
          }, 1 ).
          on( 'open', function() {
              var includeToday = '';
              if ( calendar.disabled( calendar.get('now') ) ) {
                  includeToday = ':not(.' + settings.klass.buttonToday + ')';
              }
              picker.$root.find( 'button' + includeToday + ', select' ).attr( 'disabled', false );
          }, 1 ).
          on( 'close', function() {
              picker.$root.find( 'button, select' ).attr( 'disabled', true );
          }, 1 );

  } //DatePicker


  /**
   * Set a datepicker item object.
   */
  DatePicker.prototype.set = function( type, value, options ) {

      var calendar = this,
          calendarItem = calendar.item;

      // If the value is `null` just set it immediately.
      if ( value === null ) {
          if ( type == 'clear' ) type = 'select';
          calendarItem[ type ] = value;
          return calendar
      }

      // Otherwise go through the queue of methods, and invoke the functions.
      // Update this as the time unit, and set the final value as this item.
      // * In the case of `enable`, keep the queue but set `disable` instead.
      //   And in the case of `flip`, keep the queue but set `enable` instead.
      calendarItem[ ( type == 'enable' ? 'disable' : type == 'flip' ? 'enable' : type ) ] = calendar.queue[ type ].split( ' ' ).map( function( method ) {
          value = calendar[ method ]( type, value, options );
          return value
      }).pop();

      // Check if we need to cascade through more updates.
      if ( type == 'select' ) {
          calendar.set( 'highlight', calendarItem.select, options );
      }
      else if ( type == 'highlight' ) {
          calendar.set( 'view', calendarItem.highlight, options );
      }
      else if ( type.match( /^(flip|min|max|disable|enable)$/ ) ) {
          if ( calendarItem.select && calendar.disabled( calendarItem.select ) ) {
              calendar.set( 'select', calendarItem.select, options );
          }
          if ( calendarItem.highlight && calendar.disabled( calendarItem.highlight ) ) {
              calendar.set( 'highlight', calendarItem.highlight, options );
          }
      }

      return calendar
  }; //DatePicker.prototype.set


  /**
   * Get a datepicker item object.
   */
  DatePicker.prototype.get = function( type ) {
      return this.item[ type ]
  }; //DatePicker.prototype.get


  /**
   * Create a picker date object.
   */
  DatePicker.prototype.create = function( type, value, options ) {

      var isInfiniteValue,
          calendar = this;

      // If there’s no value, use the type as the value.
      value = value === undefined ? type : value;


      // If it’s infinity, update the value.
      if ( value == -Infinity || value == Infinity ) {
          isInfiniteValue = value;
      }

      // If it’s an object, use the native date object.
      else if ( $$$1.isPlainObject( value ) && _.isInteger( value.pick ) ) {
          value = value.obj;
      }

      // If it’s an array, convert it into a date and make sure
      // that it’s a valid date – otherwise default to today.
      else if ( $$$1.isArray( value ) ) {
          value = new Date( value[ 0 ], value[ 1 ], value[ 2 ] );
          value = _.isDate( value ) ? value : calendar.create().obj;
      }

      // If it’s a number or date object, make a normalized date.
      else if ( _.isInteger( value ) || _.isDate( value ) ) {
          value = calendar.normalize( new Date( value ), options );
      }

      // If it’s a literal true or any other case, set it to now.
      else /*if ( value === true )*/ {
          value = calendar.now( type, value, options );
      }

      // Return the compiled object.
      return {
          year: isInfiniteValue || value.getFullYear(),
          month: isInfiniteValue || value.getMonth(),
          date: isInfiniteValue || value.getDate(),
          day: isInfiniteValue || value.getDay(),
          obj: isInfiniteValue || value,
          pick: isInfiniteValue || value.getTime()
      }
  }; //DatePicker.prototype.create


  /**
   * Create a range limit object using an array, date object,
   * literal “true”, or integer relative to another time.
   */
  DatePicker.prototype.createRange = function( from, to ) {

      var calendar = this,
          createDate = function( date ) {
              if ( date === true || $$$1.isArray( date ) || _.isDate( date ) ) {
                  return calendar.create( date )
              }
              return date
          };

      // Create objects if possible.
      if ( !_.isInteger( from ) ) {
          from = createDate( from );
      }
      if ( !_.isInteger( to ) ) {
          to = createDate( to );
      }

      // Create relative dates.
      if ( _.isInteger( from ) && $$$1.isPlainObject( to ) ) {
          from = [ to.year, to.month, to.date + from ];
      }
      else if ( _.isInteger( to ) && $$$1.isPlainObject( from ) ) {
          to = [ from.year, from.month, from.date + to ];
      }

      return {
          from: createDate( from ),
          to: createDate( to )
      }
  }; //DatePicker.prototype.createRange


  /**
   * Check if a date unit falls within a date range object.
   */
  DatePicker.prototype.withinRange = function( range, dateUnit ) {
      range = this.createRange(range.from, range.to);
      return dateUnit.pick >= range.from.pick && dateUnit.pick <= range.to.pick
  };


  /**
   * Check if two date range objects overlap.
   */
  DatePicker.prototype.overlapRanges = function( one, two ) {

      var calendar = this;

      // Convert the ranges into comparable dates.
      one = calendar.createRange( one.from, one.to );
      two = calendar.createRange( two.from, two.to );

      return calendar.withinRange( one, two.from ) || calendar.withinRange( one, two.to ) ||
          calendar.withinRange( two, one.from ) || calendar.withinRange( two, one.to )
  };


  /**
   * Get the date today.
   */
  DatePicker.prototype.now = function( type, value, options ) {
      value = new Date();
      if ( options && options.rel ) {
          value.setDate( value.getDate() + options.rel );
      }
      return this.normalize( value, options )
  };


  /**
   * Navigate to next/prev month.
   */
  DatePicker.prototype.navigate = function( type, value, options ) {

      var targetDateObject,
          targetYear,
          targetMonth,
          targetDate,
          isTargetArray = $$$1.isArray( value ),
          isTargetObject = $$$1.isPlainObject( value ),
          viewsetObject = this.item.view;/*,
          safety = 100*/


      if ( isTargetArray || isTargetObject ) {

          if ( isTargetObject ) {
              targetYear = value.year;
              targetMonth = value.month;
              targetDate = value.date;
          }
          else {
              targetYear = +value[0];
              targetMonth = +value[1];
              targetDate = +value[2];
          }

          // If we’re navigating months but the view is in a different
          // month, navigate to the view’s year and month.
          if ( options && options.nav && viewsetObject && viewsetObject.month !== targetMonth ) {
              targetYear = viewsetObject.year;
              targetMonth = viewsetObject.month;
          }

          // Figure out the expected target year and month.
          targetDateObject = new Date( targetYear, targetMonth + ( options && options.nav ? options.nav : 0 ), 1 );
          targetYear = targetDateObject.getFullYear();
          targetMonth = targetDateObject.getMonth();

          // If the month we’re going to doesn’t have enough days,
          // keep decreasing the date until we reach the month’s last date.
          while ( /*safety &&*/ new Date( targetYear, targetMonth, targetDate ).getMonth() !== targetMonth ) {
              targetDate -= 1;
              /*safety -= 1
              if ( !safety ) {
                  throw 'Fell into an infinite loop while navigating to ' + new Date( targetYear, targetMonth, targetDate ) + '.'
              }*/
          }

          value = [ targetYear, targetMonth, targetDate ];
      }

      return value
  }; //DatePicker.prototype.navigate


  /**
   * Normalize a date by setting the hours to midnight.
   */
  DatePicker.prototype.normalize = function( value/*, options*/ ) {
      value.setHours( 0, 0, 0, 0 );
      return value
  };


  /**
   * Measure the range of dates.
   */
  DatePicker.prototype.measure = function( type, value/*, options*/ ) {

      var calendar = this;

      // If it’s anything false-y, remove the limits.
      if ( !value ) {
          value = type == 'min' ? -Infinity : Infinity;
      }

      // If it’s a string, parse it.
      else if ( typeof value == 'string' ) {
          value = calendar.parse( type, value );
      }

      // If it's an integer, get a date relative to today.
      else if ( _.isInteger( value ) ) {
          value = calendar.now( type, value, { rel: value } );
      }

      return value
  }; ///DatePicker.prototype.measure


  /**
   * Create a viewset object based on navigation.
   */
  DatePicker.prototype.viewset = function( type, dateObject/*, options*/ ) {
      return this.create([ dateObject.year, dateObject.month, 1 ])
  };


  /**
   * Validate a date as enabled and shift if needed.
   */
  DatePicker.prototype.validate = function( type, dateObject, options ) {

      var calendar = this,

          // Keep a reference to the original date.
          originalDateObject = dateObject,

          // Make sure we have an interval.
          interval = options && options.interval ? options.interval : 1,

          // Check if the calendar enabled dates are inverted.
          isFlippedBase = calendar.item.enable === -1,

          // Check if we have any enabled dates after/before now.
          hasEnabledBeforeTarget, hasEnabledAfterTarget,

          // The min & max limits.
          minLimitObject = calendar.item.min,
          maxLimitObject = calendar.item.max,

          // Check if we’ve reached the limit during shifting.
          reachedMin, reachedMax,

          // Check if the calendar is inverted and at least one weekday is enabled.
          hasEnabledWeekdays = isFlippedBase && calendar.item.disable.filter( function( value ) {

              // If there’s a date, check where it is relative to the target.
              if ( $$$1.isArray( value ) ) {
                  var dateTime = calendar.create( value ).pick;
                  if ( dateTime < dateObject.pick ) hasEnabledBeforeTarget = true;
                  else if ( dateTime > dateObject.pick ) hasEnabledAfterTarget = true;
              }

              // Return only integers for enabled weekdays.
              return _.isInteger( value )
          }).length;/*,

          safety = 100*/



      // Cases to validate for:
      // [1] Not inverted and date disabled.
      // [2] Inverted and some dates enabled.
      // [3] Not inverted and out of range.
      //
      // Cases to **not** validate for:
      // • Navigating months.
      // • Not inverted and date enabled.
      // • Inverted and all dates disabled.
      // • ..and anything else.
      if ( !options || (!options.nav && !options.defaultValue) ) if (
          /* 1 */ ( !isFlippedBase && calendar.disabled( dateObject ) ) ||
          /* 2 */ ( isFlippedBase && calendar.disabled( dateObject ) && ( hasEnabledWeekdays || hasEnabledBeforeTarget || hasEnabledAfterTarget ) ) ||
          /* 3 */ ( !isFlippedBase && (dateObject.pick <= minLimitObject.pick || dateObject.pick >= maxLimitObject.pick) )
      ) {


          // When inverted, flip the direction if there aren’t any enabled weekdays
          // and there are no enabled dates in the direction of the interval.
          if ( isFlippedBase && !hasEnabledWeekdays && ( ( !hasEnabledAfterTarget && interval > 0 ) || ( !hasEnabledBeforeTarget && interval < 0 ) ) ) {
              interval *= -1;
          }


          // Keep looping until we reach an enabled date.
          while ( /*safety &&*/ calendar.disabled( dateObject ) ) {

              /*safety -= 1
              if ( !safety ) {
                  throw 'Fell into an infinite loop while validating ' + dateObject.obj + '.'
              }*/


              // If we’ve looped into the next/prev month with a large interval, return to the original date and flatten the interval.
              if ( Math.abs( interval ) > 1 && ( dateObject.month < originalDateObject.month || dateObject.month > originalDateObject.month ) ) {
                  dateObject = originalDateObject;
                  interval = interval > 0 ? 1 : -1;
              }


              // If we’ve reached the min/max limit, reverse the direction, flatten the interval and set it to the limit.
              if ( dateObject.pick <= minLimitObject.pick ) {
                  reachedMin = true;
                  interval = 1;
                  dateObject = calendar.create([
                      minLimitObject.year,
                      minLimitObject.month,
                      minLimitObject.date + (dateObject.pick === minLimitObject.pick ? 0 : -1)
                  ]);
              }
              else if ( dateObject.pick >= maxLimitObject.pick ) {
                  reachedMax = true;
                  interval = -1;
                  dateObject = calendar.create([
                      maxLimitObject.year,
                      maxLimitObject.month,
                      maxLimitObject.date + (dateObject.pick === maxLimitObject.pick ? 0 : 1)
                  ]);
              }


              // If we’ve reached both limits, just break out of the loop.
              if ( reachedMin && reachedMax ) {
                  break
              }


              // Finally, create the shifted date using the interval and keep looping.
              dateObject = calendar.create([ dateObject.year, dateObject.month, dateObject.date + interval ]);
          }

      } //endif


      // Return the date object settled on.
      return dateObject
  }; //DatePicker.prototype.validate


  /**
   * Check if a date is disabled.
   */
  DatePicker.prototype.disabled = function( dateToVerify ) {

      var
          calendar = this,

          // Filter through the disabled dates to check if this is one.
          isDisabledMatch = calendar.item.disable.filter( function( dateToDisable ) {

              // If the date is a number, match the weekday with 0index and `firstDay` check.
              if ( _.isInteger( dateToDisable ) ) {
                  return dateToVerify.day === ( calendar.settings.firstDay ? dateToDisable : dateToDisable - 1 ) % 7
              }

              // If it’s an array or a native JS date, create and match the exact date.
              if ( $$$1.isArray( dateToDisable ) || _.isDate( dateToDisable ) ) {
                  return dateToVerify.pick === calendar.create( dateToDisable ).pick
              }

              // If it’s an object, match a date within the “from” and “to” range.
              if ( $$$1.isPlainObject( dateToDisable ) ) {
                  return calendar.withinRange( dateToDisable, dateToVerify )
              }
          });

      // If this date matches a disabled date, confirm it’s not inverted.
      isDisabledMatch = isDisabledMatch.length && !isDisabledMatch.filter(function( dateToDisable ) {
          return $$$1.isArray( dateToDisable ) && dateToDisable[3] == 'inverted' ||
              $$$1.isPlainObject( dateToDisable ) && dateToDisable.inverted
      }).length;

      // Check the calendar “enabled” flag and respectively flip the
      // disabled state. Then also check if it’s beyond the min/max limits.
      return calendar.item.enable === -1 ? !isDisabledMatch : isDisabledMatch ||
          dateToVerify.pick < calendar.item.min.pick ||
          dateToVerify.pick > calendar.item.max.pick

  }; //DatePicker.prototype.disabled


  /**
   * Parse a string into a usable type.
   */
  DatePicker.prototype.parse = function( type, value, options ) {

      var calendar = this,
          parsingObject = {};

      // If it’s already parsed, we’re good.
      if ( !value || typeof value != 'string' ) {
          return value
      }

      // We need a `.format` to parse the value with.
      if ( !( options && options.format ) ) {
          options = options || {};
          options.format = calendar.settings.format;
      }

      // Convert the format into an array and then map through it.
      calendar.formats.toArray( options.format ).map( function( label ) {

          var
              // Grab the formatting label.
              formattingLabel = calendar.formats[ label ],

              // The format length is from the formatting label function or the
              // label length without the escaping exclamation (!) mark.
              formatLength = formattingLabel ? _.trigger( formattingLabel, calendar, [ value, parsingObject ] ) : label.replace( /^!/, '' ).length;

          // If there's a format label, split the value up to the format length.
          // Then add it to the parsing object with appropriate label.
          if ( formattingLabel ) {
              parsingObject[ label ] = value.substr( 0, formatLength );
          }

          // Update the value as the substring from format length to end.
          value = value.substr( formatLength );
      });

      // Compensate for month 0index.
      return [
          parsingObject.yyyy || parsingObject.yy,
          +( parsingObject.mm || parsingObject.m ) - 1,
          parsingObject.dd || parsingObject.d
      ]
  }; //DatePicker.prototype.parse


  /**
   * Various formats to display the object in.
   */
  DatePicker.prototype.formats = (function() {

      // Return the length of the first word in a collection.
      function getWordLengthFromCollection( string, collection, dateObject ) {

          // Grab the first word from the string.
          // Regex pattern from http://stackoverflow.com/q/150033
          var word = string.match( /[^\x00-\x7F]+|\w+/ )[ 0 ];

          // If there's no month index, add it to the date object
          if ( !dateObject.mm && !dateObject.m ) {
              dateObject.m = collection.indexOf( word ) + 1;
          }

          // Return the length of the word.
          return word.length
      }

      // Get the length of the first word in a string.
      function getFirstWordLength( string ) {
          return string.match( /\w+/ )[ 0 ].length
      }

      return {

          d: function( string, dateObject ) {

              // If there's string, then get the digits length.
              // Otherwise return the selected date.
              return string ? _.digits( string ) : dateObject.date
          },
          dd: function( string, dateObject ) {

              // If there's a string, then the length is always 2.
              // Otherwise return the selected date with a leading zero.
              return string ? 2 : _.lead( dateObject.date )
          },
          ddd: function( string, dateObject ) {

              // If there's a string, then get the length of the first word.
              // Otherwise return the short selected weekday.
              return string ? getFirstWordLength( string ) : this.settings.weekdaysShort[ dateObject.day ]
          },
          dddd: function( string, dateObject ) {

              // If there's a string, then get the length of the first word.
              // Otherwise return the full selected weekday.
              return string ? getFirstWordLength( string ) : this.settings.weekdaysFull[ dateObject.day ]
          },
          m: function( string, dateObject ) {

              // If there's a string, then get the length of the digits
              // Otherwise return the selected month with 0index compensation.
              return string ? _.digits( string ) : dateObject.month + 1
          },
          mm: function( string, dateObject ) {

              // If there's a string, then the length is always 2.
              // Otherwise return the selected month with 0index and leading zero.
              return string ? 2 : _.lead( dateObject.month + 1 )
          },
          mmm: function( string, dateObject ) {

              var collection = this.settings.monthsShort;

              // If there's a string, get length of the relevant month from the short
              // months collection. Otherwise return the selected month from that collection.
              return string ? getWordLengthFromCollection( string, collection, dateObject ) : collection[ dateObject.month ]
          },
          mmmm: function( string, dateObject ) {

              var collection = this.settings.monthsFull;

              // If there's a string, get length of the relevant month from the full
              // months collection. Otherwise return the selected month from that collection.
              return string ? getWordLengthFromCollection( string, collection, dateObject ) : collection[ dateObject.month ]
          },
          yy: function( string, dateObject ) {

              // If there's a string, then the length is always 2.
              // Otherwise return the selected year by slicing out the first 2 digits.
              return string ? 2 : ( '' + dateObject.year ).slice( 2 )
          },
          yyyy: function( string, dateObject ) {

              // If there's a string, then the length is always 4.
              // Otherwise return the selected year.
              return string ? 4 : dateObject.year
          },

          // Create an array by splitting the formatting string passed.
          toArray: function( formatString ) { return formatString.split( /(d{1,4}|m{1,4}|y{4}|yy|!.)/g ) },

          // Format an object into a string using the formatting options.
          toString: function ( formatString, itemObject ) {
              var calendar = this;
              return calendar.formats.toArray( formatString ).map( function( label ) {
                  return _.trigger( calendar.formats[ label ], calendar, [ 0, itemObject ] ) || label.replace( /^!/, '' )
              }).join( '' )
          }
      }
  })(); //DatePicker.prototype.formats




  /**
   * Check if two date units are the exact.
   */
  DatePicker.prototype.isDateExact = function( one, two ) {

      var calendar = this;

      // When we’re working with weekdays, do a direct comparison.
      if (
          ( _.isInteger( one ) && _.isInteger( two ) ) ||
          ( typeof one == 'boolean' && typeof two == 'boolean' )
       ) {
          return one === two
      }

      // When we’re working with date representations, compare the “pick” value.
      if (
          ( _.isDate( one ) || $$$1.isArray( one ) ) &&
          ( _.isDate( two ) || $$$1.isArray( two ) )
      ) {
          return calendar.create( one ).pick === calendar.create( two ).pick
      }

      // When we’re working with range objects, compare the “from” and “to”.
      if ( $$$1.isPlainObject( one ) && $$$1.isPlainObject( two ) ) {
          return calendar.isDateExact( one.from, two.from ) && calendar.isDateExact( one.to, two.to )
      }

      return false
  };


  /**
   * Check if two date units overlap.
   */
  DatePicker.prototype.isDateOverlap = function( one, two ) {

      var calendar = this,
          firstDay = calendar.settings.firstDay ? 1 : 0;

      // When we’re working with a weekday index, compare the days.
      if ( _.isInteger( one ) && ( _.isDate( two ) || $$$1.isArray( two ) ) ) {
          one = one % 7 + firstDay;
          return one === calendar.create( two ).day + 1
      }
      if ( _.isInteger( two ) && ( _.isDate( one ) || $$$1.isArray( one ) ) ) {
          two = two % 7 + firstDay;
          return two === calendar.create( one ).day + 1
      }

      // When we’re working with range objects, check if the ranges overlap.
      if ( $$$1.isPlainObject( one ) && $$$1.isPlainObject( two ) ) {
          return calendar.overlapRanges( one, two )
      }

      return false
  };


  /**
   * Flip the “enabled” state.
   */
  DatePicker.prototype.flipEnable = function(val) {
      var itemObject = this.item;
      itemObject.enable = val || (itemObject.enable == -1 ? 1 : -1);
  };


  /**
   * Mark a collection of dates as “disabled”.
   */
  DatePicker.prototype.deactivate = function( type, datesToDisable ) {

      var calendar = this,
          disabledItems = calendar.item.disable.slice(0);


      // If we’re flipping, that’s all we need to do.
      if ( datesToDisable == 'flip' ) {
          calendar.flipEnable();
      }

      else if ( datesToDisable === false ) {
          calendar.flipEnable(1);
          disabledItems = [];
      }

      else if ( datesToDisable === true ) {
          calendar.flipEnable(-1);
          disabledItems = [];
      }

      // Otherwise go through the dates to disable.
      else {

          datesToDisable.map(function( unitToDisable ) {

              var matchFound;

              // When we have disabled items, check for matches.
              // If something is matched, immediately break out.
              for ( var index = 0; index < disabledItems.length; index += 1 ) {
                  if ( calendar.isDateExact( unitToDisable, disabledItems[index] ) ) {
                      matchFound = true;
                      break
                  }
              }

              // If nothing was found, add the validated unit to the collection.
              if ( !matchFound ) {
                  if (
                      _.isInteger( unitToDisable ) ||
                      _.isDate( unitToDisable ) ||
                      $$$1.isArray( unitToDisable ) ||
                      ( $$$1.isPlainObject( unitToDisable ) && unitToDisable.from && unitToDisable.to )
                  ) {
                      disabledItems.push( unitToDisable );
                  }
              }
          });
      }

      // Return the updated collection.
      return disabledItems
  }; //DatePicker.prototype.deactivate


  /**
   * Mark a collection of dates as “enabled”.
   */
  DatePicker.prototype.activate = function( type, datesToEnable ) {

      var calendar = this,
          disabledItems = calendar.item.disable,
          disabledItemsCount = disabledItems.length;

      // If we’re flipping, that’s all we need to do.
      if ( datesToEnable == 'flip' ) {
          calendar.flipEnable();
      }

      else if ( datesToEnable === true ) {
          calendar.flipEnable(1);
          disabledItems = [];
      }

      else if ( datesToEnable === false ) {
          calendar.flipEnable(-1);
          disabledItems = [];
      }

      // Otherwise go through the disabled dates.
      else {

          datesToEnable.map(function( unitToEnable ) {

              var matchFound,
                  disabledUnit,
                  index,
                  isExactRange;

              // Go through the disabled items and try to find a match.
              for ( index = 0; index < disabledItemsCount; index += 1 ) {

                  disabledUnit = disabledItems[index];

                  // When an exact match is found, remove it from the collection.
                  if ( calendar.isDateExact( disabledUnit, unitToEnable ) ) {
                      matchFound = disabledItems[index] = null;
                      isExactRange = true;
                      break
                  }

                  // When an overlapped match is found, add the “inverted” state to it.
                  else if ( calendar.isDateOverlap( disabledUnit, unitToEnable ) ) {
                      if ( $$$1.isPlainObject( unitToEnable ) ) {
                          unitToEnable.inverted = true;
                          matchFound = unitToEnable;
                      }
                      else if ( $$$1.isArray( unitToEnable ) ) {
                          matchFound = unitToEnable;
                          if ( !matchFound[3] ) matchFound.push( 'inverted' );
                      }
                      else if ( _.isDate( unitToEnable ) ) {
                          matchFound = [ unitToEnable.getFullYear(), unitToEnable.getMonth(), unitToEnable.getDate(), 'inverted' ];
                      }
                      break
                  }
              }

              // If a match was found, remove a previous duplicate entry.
              if ( matchFound ) for ( index = 0; index < disabledItemsCount; index += 1 ) {
                  if ( calendar.isDateExact( disabledItems[index], unitToEnable ) ) {
                      disabledItems[index] = null;
                      break
                  }
              }

              // In the event that we’re dealing with an exact range of dates,
              // make sure there are no “inverted” dates because of it.
              if ( isExactRange ) for ( index = 0; index < disabledItemsCount; index += 1 ) {
                  if ( calendar.isDateOverlap( disabledItems[index], unitToEnable ) ) {
                      disabledItems[index] = null;
                      break
                  }
              }

              // If something is still matched, add it into the collection.
              if ( matchFound ) {
                  disabledItems.push( matchFound );
              }
          });
      }

      // Return the updated collection.
      return disabledItems.filter(function( val ) { return val != null })
  }; //DatePicker.prototype.activate


  /**
   * Create a string for the nodes in the picker.
   */
  DatePicker.prototype.nodes = function( isOpen ) {

      var
          calendar = this,
          settings = calendar.settings,
          calendarItem = calendar.item,
          nowObject = calendarItem.now,
          selectedObject = calendarItem.select,
          highlightedObject = calendarItem.highlight,
          viewsetObject = calendarItem.view,
          disabledCollection = calendarItem.disable,
          minLimitObject = calendarItem.min,
          maxLimitObject = calendarItem.max,


          // Create the calendar table head using a copy of weekday labels collection.
          // * We do a copy so we don't mutate the original array.
          tableHead = (function( collection, fullCollection ) {

              // If the first day should be Monday, move Sunday to the end.
              if ( settings.firstDay ) {
                  collection.push( collection.shift() );
                  fullCollection.push( fullCollection.shift() );
              }

              // Create and return the table head group.
              return _.node(
                  'thead',
                  _.node(
                      'tr',
                      _.group({
                          min: 0,
                          max: DAYS_IN_WEEK - 1,
                          i: 1,
                          node: 'th',
                          item: function( counter ) {
                              return [
                                  collection[ counter ],
                                  settings.klass.weekdays,
                                  'scope=col title="' + fullCollection[ counter ] + '"'
                              ]
                          }
                      })
                  )
              ) //endreturn
          })( ( settings.showWeekdaysFull ? settings.weekdaysFull : settings.weekdaysShort ).slice( 0 ), settings.weekdaysFull.slice( 0 ) ), //tableHead


          // Create the nav for next/prev month.
          createMonthNav = function( next ) {

              // Otherwise, return the created month tag.
              return _.node(
                  'div',
                  ' ',
                  settings.klass[ 'nav' + ( next ? 'Next' : 'Prev' ) ] + (

                      // If the focused month is outside the range, disabled the button.
                      ( next && viewsetObject.year >= maxLimitObject.year && viewsetObject.month >= maxLimitObject.month ) ||
                      ( !next && viewsetObject.year <= minLimitObject.year && viewsetObject.month <= minLimitObject.month ) ?
                      ' ' + settings.klass.navDisabled : ''
                  ),
                  'data-nav=' + ( next || -1 ) + ' ' +
                  _.ariaAttr({
                      role: 'button',
                      controls: calendar.$node[0].id + '_table'
                  }) + ' ' +
                  'title="' + (next ? settings.labelMonthNext : settings.labelMonthPrev ) + '"'
              ) //endreturn
          }, //createMonthNav


          // Create the month label.
          createMonthLabel = function() {

              var monthsCollection = settings.showMonthsShort ? settings.monthsShort : settings.monthsFull;

              // If there are months to select, add a dropdown menu.
              if ( settings.selectMonths ) {

                  return _.node( 'select',
                      _.group({
                          min: 0,
                          max: 11,
                          i: 1,
                          node: 'option',
                          item: function( loopedMonth ) {

                              return [

                                  // The looped month and no classes.
                                  monthsCollection[ loopedMonth ], 0,

                                  // Set the value and selected index.
                                  'value=' + loopedMonth +
                                  ( viewsetObject.month == loopedMonth ? ' selected' : '' ) +
                                  (
                                      (
                                          ( viewsetObject.year == minLimitObject.year && loopedMonth < minLimitObject.month ) ||
                                          ( viewsetObject.year == maxLimitObject.year && loopedMonth > maxLimitObject.month )
                                      ) ?
                                      ' disabled' : ''
                                  )
                              ]
                          }
                      }),
                      settings.klass.selectMonth,
                      ( isOpen ? '' : 'disabled' ) + ' ' +
                      _.ariaAttr({ controls: calendar.$node[0].id + '_table' }) + ' ' +
                      'title="' + settings.labelMonthSelect + '"'
                  )
              }

              // If there's a need for a month selector
              return _.node( 'div', monthsCollection[ viewsetObject.month ], settings.klass.month )
          }, //createMonthLabel


          // Create the year label.
          createYearLabel = function() {

              var focusedYear = viewsetObject.year,

              // If years selector is set to a literal "true", set it to 5. Otherwise
              // divide in half to get half before and half after focused year.
              numberYears = settings.selectYears === true ? 5 : ~~( settings.selectYears / 2 );

              // If there are years to select, add a dropdown menu.
              if ( numberYears ) {

                  var
                      minYear = minLimitObject.year,
                      maxYear = maxLimitObject.year,
                      lowestYear = focusedYear - numberYears,
                      highestYear = focusedYear + numberYears;

                  // If the min year is greater than the lowest year, increase the highest year
                  // by the difference and set the lowest year to the min year.
                  if ( minYear > lowestYear ) {
                      highestYear += minYear - lowestYear;
                      lowestYear = minYear;
                  }

                  // If the max year is less than the highest year, decrease the lowest year
                  // by the lower of the two: available and needed years. Then set the
                  // highest year to the max year.
                  if ( maxYear < highestYear ) {

                      var availableYears = lowestYear - minYear,
                          neededYears = highestYear - maxYear;

                      lowestYear -= availableYears > neededYears ? neededYears : availableYears;
                      highestYear = maxYear;
                  }

                  return _.node( 'select',
                      _.group({
                          min: lowestYear,
                          max: highestYear,
                          i: 1,
                          node: 'option',
                          item: function( loopedYear ) {
                              return [

                                  // The looped year and no classes.
                                  loopedYear, 0,

                                  // Set the value and selected index.
                                  'value=' + loopedYear + ( focusedYear == loopedYear ? ' selected' : '' )
                              ]
                          }
                      }),
                      settings.klass.selectYear,
                      ( isOpen ? '' : 'disabled' ) + ' ' + _.ariaAttr({ controls: calendar.$node[0].id + '_table' }) + ' ' +
                      'title="' + settings.labelYearSelect + '"'
                  )
              }

              // Otherwise just return the year focused
              return _.node( 'div', focusedYear, settings.klass.year )
          }; //createYearLabel


      // Create and return the entire calendar.
      return _.node(
          'div',
          ( settings.selectYears ? createYearLabel() + createMonthLabel() : createMonthLabel() + createYearLabel() ) +
          createMonthNav() + createMonthNav( 1 ),
          settings.klass.header
      ) + _.node(
          'table',
          tableHead +
          _.node(
              'tbody',
              _.group({
                  min: 0,
                  max: WEEKS_IN_CALENDAR - 1,
                  i: 1,
                  node: 'tr',
                  item: function( rowCounter ) {

                      // If Monday is the first day and the month starts on Sunday, shift the date back a week.
                      var shiftDateBy = settings.firstDay && calendar.create([ viewsetObject.year, viewsetObject.month, 1 ]).day === 0 ? -7 : 0;

                      return [
                          _.group({
                              min: DAYS_IN_WEEK * rowCounter - viewsetObject.day + shiftDateBy + 1, // Add 1 for weekday 0index
                              max: function() {
                                  return this.min + DAYS_IN_WEEK - 1
                              },
                              i: 1,
                              node: 'td',
                              item: function( targetDate ) {

                                  // Convert the time date from a relative date to a target date.
                                  targetDate = calendar.create([ viewsetObject.year, viewsetObject.month, targetDate + ( settings.firstDay ? 1 : 0 ) ]);

                                  var isSelected = selectedObject && selectedObject.pick == targetDate.pick,
                                      isHighlighted = highlightedObject && highlightedObject.pick == targetDate.pick,
                                      isDisabled = disabledCollection && calendar.disabled( targetDate ) || targetDate.pick < minLimitObject.pick || targetDate.pick > maxLimitObject.pick,
                                      formattedDate = _.trigger( calendar.formats.toString, calendar, [ settings.format, targetDate ] );

                                  return [
                                      _.node(
                                          'div',
                                          targetDate.date,
                                          (function( klasses ) {

                                              // Add the `infocus` or `outfocus` classes based on month in view.
                                              klasses.push( viewsetObject.month == targetDate.month ? settings.klass.infocus : settings.klass.outfocus );

                                              // Add the `today` class if needed.
                                              if ( nowObject.pick == targetDate.pick ) {
                                                  klasses.push( settings.klass.now );
                                              }

                                              // Add the `selected` class if something's selected and the time matches.
                                              if ( isSelected ) {
                                                  klasses.push( settings.klass.selected );
                                              }

                                              // Add the `highlighted` class if something's highlighted and the time matches.
                                              if ( isHighlighted ) {
                                                  klasses.push( settings.klass.highlighted );
                                              }

                                              // Add the `disabled` class if something's disabled and the object matches.
                                              if ( isDisabled ) {
                                                  klasses.push( settings.klass.disabled );
                                              }

                                              return klasses.join( ' ' )
                                          })([ settings.klass.day ]),
                                          'data-pick=' + targetDate.pick + ' ' + _.ariaAttr({
                                              role: 'gridcell',
                                              label: formattedDate,
                                              selected: isSelected && calendar.$node.val() === formattedDate ? true : null,
                                              activedescendant: isHighlighted ? true : null,
                                              disabled: isDisabled ? true : null
                                          })
                                      ),
                                      '',
                                      _.ariaAttr({ role: 'presentation' })
                                  ] //endreturn
                              }
                          })
                      ] //endreturn
                  }
              })
          ),
          settings.klass.table,
          'id="' + calendar.$node[0].id + '_table' + '" ' + _.ariaAttr({
              role: 'grid',
              controls: calendar.$node[0].id,
              readonly: true
          })
      ) +

      // * For Firefox forms to submit, make sure to set the buttons’ `type` attributes as “button”.
      _.node(
          'div',
          _.node( 'button', settings.today, settings.klass.buttonToday,
              'type=button data-pick=' + nowObject.pick +
              ( isOpen && !calendar.disabled(nowObject) ? '' : ' disabled' ) + ' ' +
              _.ariaAttr({ controls: calendar.$node[0].id }) ) +
          _.node( 'button', settings.clear, settings.klass.buttonClear,
              'type=button data-clear=1' +
              ( isOpen ? '' : ' disabled' ) + ' ' +
              _.ariaAttr({ controls: calendar.$node[0].id }) ) +
          _.node('button', settings.close, settings.klass.buttonClose,
              'type=button data-close=true ' +
              ( isOpen ? '' : ' disabled' ) + ' ' +
              _.ariaAttr({ controls: calendar.$node[0].id }) ),
          settings.klass.footer
      ) //endreturn
  }; //DatePicker.prototype.nodes




  /**
   * The date picker defaults.
   */
  DatePicker.defaults = (function( prefix ) {

      return {

          // The title label to use for the month nav buttons
          labelMonthNext: 'Next month',
          labelMonthPrev: 'Previous month',

          // The title label to use for the dropdown selectors
          labelMonthSelect: 'Select a month',
          labelYearSelect: 'Select a year',

          // Months and weekdays
          monthsFull: [ 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December' ],
          monthsShort: [ 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec' ],
          weekdaysFull: [ 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday' ],
          weekdaysShort: [ 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat' ],

          // Today and clear
          today: 'Today',
          clear: 'Clear',
          close: 'Close',

          // Picker close behavior
          closeOnSelect: true,
          closeOnClear: true,

          // The format to show on the `input` element
          format: 'd mmmm, yyyy',

          // Classes
          klass: {

              table: prefix + 'table',

              header: prefix + 'header',

              navPrev: prefix + 'nav--prev',
              navNext: prefix + 'nav--next',
              navDisabled: prefix + 'nav--disabled',

              month: prefix + 'month',
              year: prefix + 'year',

              selectMonth: prefix + 'select--month',
              selectYear: prefix + 'select--year',

              weekdays: prefix + 'weekday',

              day: prefix + 'day',
              disabled: prefix + 'day--disabled',
              selected: prefix + 'day--selected',
              highlighted: prefix + 'day--highlighted',
              now: prefix + 'day--today',
              infocus: prefix + 'day--infocus',
              outfocus: prefix + 'day--outfocus',

              footer: prefix + 'footer',

              buttonClear: prefix + 'button--clear',
              buttonToday: prefix + 'button--today',
              buttonClose: prefix + 'button--close'
          }
      }
  })( Picker.klasses().picker + '__' );





  /**
   * Extend the picker to add the date picker.
   */
  Picker.extend( 'pickadate', DatePicker );


  }));
  });

  /*
   * Date picker plugin extends `pickadate.js` by Amsul
   */

  var PickDate = function ($$$1) {
    // constants >>>
    var DATA_KEY = 'md.pickdate';
    var NAME = 'pickdate';
    var NO_CONFLICT = $$$1.fn[NAME];
    var Default = {
      cancel: 'Cancel',
      closeOnCancel: true,
      closeOnSelect: false,
      container: '',
      containerHidden: '',
      disable: [],
      firstDay: 0,
      format: 'd/m/yyyy',
      formatSubmit: '',
      hiddenName: false,
      hiddenPrefix: '',
      hiddenSuffix: '',
      klass: {
        // button
        buttonClear: 'btn btn-outline-primary picker-button-clear',
        buttonClose: 'btn btn-outline-primary picker-button-close',
        buttonToday: 'btn btn-outline-primary picker-button-today',
        // day
        day: 'picker-day',
        disabled: 'picker-day-disabled',
        highlighted: 'picker-day-highlighted',
        infocus: 'picker-day-infocus',
        now: 'picker-day-today',
        outfocus: 'picker-day-outfocus',
        selected: 'picker-day-selected',
        weekdays: 'picker-weekday',
        // element
        box: 'picker-box',
        footer: 'picker-footer',
        frame: 'picker-frame',
        header: 'picker-header',
        holder: 'picker-holder',
        table: 'picker-table',
        wrap: 'picker-wrap',
        // input element
        active: 'picker-input-active',
        input: 'picker-input',
        // month and year nav
        month: 'picker-month',
        navDisabled: 'picker-nav-disabled',
        navNext: 'material-icons picker-nav-next',
        navPrev: 'material-icons picker-nav-prev',
        selectMonth: 'picker-select-month',
        selectYear: 'picker-select-year',
        year: 'picker-year',
        // root picker
        focused: 'picker-focused',
        opened: 'picker-opened',
        picker: 'picker'
      },
      labelMonthNext: 'Next month',
      labelMonthPrev: 'Previous month',
      labelMonthSelect: 'Select a month',
      labelYearSelect: 'Select a year',
      max: false,
      min: false,
      monthsFull: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
      monthsShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      ok: 'OK',
      onClose: function onClose() {// Do nothing
      },
      onOpen: function onOpen() {// Do nothing
      },
      onRender: function onRender() {// Do nothing
      },
      onSet: function onSet() {// Do nothing
      },
      onStart: function onStart() {// Do nothing
      },
      onStop: function onStop() {// Do nothing
      },
      selectMonths: false,
      selectYears: false,
      today: '',
      weekdaysFull: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      weekdaysShort: ['S', 'M', 'T', 'W', 'T', 'F', 'S']
    };
    var DefaultType = {
      cancel: 'string',
      closeOnCancel: 'boolean',
      closeOnSelect: 'boolean',
      container: 'string',
      containerHidden: 'string',
      disable: 'array',
      firstDay: 'number',
      format: 'string',
      formatSubmit: 'string',
      hiddenName: 'boolean',
      hiddenPrefix: 'string',
      hiddenSuffix: 'string',
      klass: 'object',
      labelMonthNext: 'string',
      labelMonthPrev: 'string',
      labelMonthSelect: 'string',
      labelYearSelect: 'string',
      max: 'boolean || date',
      min: 'boolean || date',
      monthsFull: 'array',
      monthsShort: 'array',
      ok: 'string',
      onClose: 'function',
      onOpen: 'function',
      onRender: 'function',
      onSet: 'function',
      onStart: 'function',
      onStop: 'function',
      selectMonths: 'boolean',
      selectYears: 'boolean || number',
      today: 'string',
      weekdaysFull: 'array',
      weekdaysShort: 'array'
    };

    var PickDate =
    /*#__PURE__*/
    function () {
      function PickDate(element, config) {
        this._config = this._getConfig(config);
        this._element = element;
      }

      var _proto = PickDate.prototype;

      _proto.display = function display(datepickerApi, datepickerRoot, datepickerValue) {
        $$$1('.picker-date-display', datepickerRoot).remove();
        $$$1('.picker-wrap', datepickerRoot).prepend("<div class=\"picker-date-display\"><div class=\"picker-date-display-top\"><span class=\"picker-year-display\">" + datepickerApi.get(datepickerValue, 'yyyy') + "</span></div><div class=\"picker-date-display-bottom\"><span class=\"picker-weekday-display\">" + datepickerApi.get(datepickerValue, 'dddd') + "</span><span class=\"picker-day-display\">" + datepickerApi.get(datepickerValue, 'd') + "</span><span class=\"picker-month-display\">" + datepickerApi.get(datepickerValue, 'mmm') + "</span></div></div>");
      };

      _proto.show = function show() {
        var _this = this;

        $$$1(this._element).pickadate({
          clear: this._config.cancel,
          close: this._config.ok,
          closeOnClear: this._config.closeOnCancel,
          closeOnSelect: this._config.closeOnSelect,
          container: this._config.container,
          containerHidden: this._config.containerHidden,
          disable: this._config.disable,
          firstDay: this._config.firstDay,
          format: this._config.format,
          formatSubmit: this._config.formatSubmit,
          klass: this._config.klass,
          hiddenName: this._config.hiddenName,
          hiddenPrefix: this._config.hiddenPrefix,
          hiddenSuffix: this._config.hiddenSuffix,
          labelMonthNext: this._config.labelMonthNext,
          labelMonthPrev: this._config.labelMonthPrev,
          labelMonthSelect: this._config.labelMonthSelect,
          labelYearSelect: this._config.labelYearSelect,
          max: this._config.max,
          min: this._config.min,
          monthsFull: this._config.monthsFull,
          monthsShort: this._config.monthsShort,
          onClose: this._config.onClose,
          onOpen: this._config.onOpen,
          onRender: this._config.onRender,
          onSet: this._config.onSet,
          onStart: this._config.onStart,
          onStop: this._config.onStop,
          selectMonths: this._config.selectMonths,
          selectYears: this._config.selectYears,
          today: this._config.today,
          weekdaysFull: this._config.weekdaysFull,
          weekdaysShort: this._config.weekdaysShort
        });
        var datepickerApi = $$$1(this._element).pickadate('picker');
        var datepickerRoot = datepickerApi.$root;
        datepickerApi.on({
          close: function close() {
            $$$1(document.activeElement).blur();
          },
          open: function open() {
            if (!$$$1('.picker__date-display', datepickerRoot).length) {
              _this.display(datepickerApi, datepickerRoot, 'highlight');
            }
          },
          set: function set() {
            if (datepickerApi.get('select') !== null) {
              _this.display(datepickerApi, datepickerRoot, 'select');
            }
          }
        });
      };

      _proto._getConfig = function _getConfig(config) {
        config = _objectSpread({}, Default, config);
        Util.typeCheckConfig(NAME, config, DefaultType);
        return config;
      };

      PickDate._jQueryInterface = function _jQueryInterface(config) {
        return this.each(function () {
          var _config = _objectSpread({}, Default, $$$1(this).data(), typeof config === 'object' && config ? config : {});

          var data = $$$1(this).data(DATA_KEY);

          if (!data) {
            data = new PickDate(this, _config);
            $$$1(this).data(DATA_KEY, data);
          }

          data.show();
        });
      };

      return PickDate;
    }();

    $$$1.fn[NAME] = PickDate._jQueryInterface;
    $$$1.fn[NAME].Constructor = PickDate;

    $$$1.fn[NAME].noConflict = function () {
      $$$1.fn[NAME] = NO_CONFLICT;
      return PickDate._jQueryInterface;
    };
  }($);

  /*
   * Selection control plugin fixes the focus state problem with
   * Chrome persisting focus state on checkboxes/radio buttons after clicking
   */

  var SelectionControlFocus = function ($$$1) {
    // constants >>>
    var DATA_KEY = 'md.selectioncontrolfocus';
    var EVENT_KEY = "." + DATA_KEY;
    var ClassName = {
      FOCUS: 'focus'
    };
    var LastInteraction = {
      IS_MOUSEDOWN: false
    };
    var Event = {
      BLUR: "blur" + EVENT_KEY,
      FOCUS: "focus" + EVENT_KEY,
      MOUSEDOWN: "mousedown" + EVENT_KEY,
      MOUSEUP: "mouseup" + EVENT_KEY
    };
    var Selector = {
      CONTROL: '.custom-control',
      INPUT: '.custom-control-input' // <<< constants

    };
    $$$1(document).on("" + Event.BLUR, Selector.INPUT, function () {
      $$$1(this).removeClass(ClassName.FOCUS);
    }).on("" + Event.FOCUS, Selector.INPUT, function () {
      if (LastInteraction.IS_MOUSEDOWN === false) {
        $$$1(this).addClass(ClassName.FOCUS);
      }
    }).on("" + Event.MOUSEDOWN, Selector.CONTROL, function () {
      LastInteraction.IS_MOUSEDOWN = true;
    }).on("" + Event.MOUSEUP, Selector.CONTROL, function () {
      setTimeout(function () {
        LastInteraction.IS_MOUSEDOWN = false;
      }, 1);
    });
  }($);

  /*
   * Tab indicator animation
   * Requires Bootstrap's (v4.1.X) `tab.js`
   */

  var TabSwitch = function ($$$1) {
    // constants >>>
    var DATA_KEY = 'md.tabswitch';
    var NAME = 'tabswitch';
    var NO_CONFLICT = $$$1.fn[NAME];
    var ClassName = {
      ANIMATE: 'animate',
      DROPDOWN_ITEM: 'dropdown-item',
      INDICATOR: 'nav-tabs-indicator',
      MATERIAL: 'nav-tabs-material',
      SCROLLABLE: 'nav-tabs-scrollable',
      SHOW: 'show'
    };
    var Event = {
      SHOW_BS_TAB: 'show.bs.tab'
    };
    var Selector = {
      DATA_TOGGLE: '.nav-tabs [data-toggle="tab"]',
      DROPDOWN: '.dropdown',
      NAV: '.nav-tabs' // <<< constants

    };

    var TabSwitch =
    /*#__PURE__*/
    function () {
      function TabSwitch(nav) {
        this._nav = nav;
        this._navindicator = null;
      }

      var _proto = TabSwitch.prototype;

      _proto.switch = function _switch(element, relatedTarget) {
        var _this = this;

        var navLeft = $$$1(this._nav).offset().left;
        var navScrollLeft = $$$1(this._nav).scrollLeft();
        var navWidth = $$$1(this._nav).outerWidth();

        if (!this._navindicator) {
          this._createIndicator(navLeft, navScrollLeft, navWidth, relatedTarget);
        }

        if ($$$1(element).hasClass(ClassName.DROPDOWN_ITEM)) {
          element = $$$1(element).closest(Selector.DROPDOWN);
        }

        var elLeft = $$$1(element).offset().left;
        var elWidth = $$$1(element).outerWidth();
        $$$1(this._navindicator).addClass(ClassName.SHOW);
        Util.reflow(this._navindicator);
        $$$1(this._nav).addClass(ClassName.ANIMATE);
        $$$1(this._navindicator).css({
          left: elLeft + navScrollLeft - navLeft,
          right: navWidth - (elLeft + navScrollLeft - navLeft + elWidth)
        });

        var complete = function complete() {
          $$$1(_this._nav).removeClass(ClassName.ANIMATE);
          $$$1(_this._navindicator).removeClass(ClassName.SHOW);
        };

        var transitionDuration = Util.getTransitionDurationFromElement(this._navindicator);
        $$$1(this._navindicator).one(Util.TRANSITION_END, complete).emulateTransitionEnd(transitionDuration);
      };

      _proto._createIndicator = function _createIndicator(navLeft, navScrollLeft, navWidth, relatedTarget) {
        this._navindicator = document.createElement('div');
        $$$1(this._navindicator).addClass(ClassName.INDICATOR).appendTo(this._nav);

        if (typeof relatedTarget !== 'undefined') {
          if ($$$1(relatedTarget).hasClass(ClassName.DROPDOWN_ITEM)) {
            relatedTarget = $$$1(relatedTarget).closest(Selector.DROPDOWN);
          }

          var relatedLeft = $$$1(relatedTarget).offset().left;
          var relatedWidth = $$$1(relatedTarget).outerWidth();
          $$$1(this._navindicator).css({
            left: relatedLeft + navScrollLeft - navLeft,
            right: navWidth - (relatedLeft + navScrollLeft - navLeft + relatedWidth)
          });
        }

        $$$1(this._nav).addClass(ClassName.MATERIAL);
      };

      TabSwitch._jQueryInterface = function _jQueryInterface(relatedTarget) {
        return this.each(function () {
          var nav = $$$1(this).closest(Selector.NAV)[0];

          if (!nav) {
            return;
          }

          var data = $$$1(nav).data(DATA_KEY);

          if (!data) {
            data = new TabSwitch(nav);
            $$$1(nav).data(DATA_KEY, data);
          }

          data.switch(this, relatedTarget);
        });
      };

      return TabSwitch;
    }();

    $$$1(document).on(Event.SHOW_BS_TAB, Selector.DATA_TOGGLE, function (event) {
      TabSwitch._jQueryInterface.call($$$1(this), event.relatedTarget);
    });
    $$$1.fn[NAME] = TabSwitch._jQueryInterface;
    $$$1.fn[NAME].Constructor = TabSwitch;

    $$$1.fn[NAME].noConflict = function () {
      $$$1.fn[NAME] = NO_CONFLICT;
      return TabSwitch._jQueryInterface;
    };

    return TabSwitch;
  }($);

  exports.Util = Util;
  exports.ExpansionPanel = ExpansionPanel;
  exports.FloatingLabel = FloatingLabel;
  exports.NavDrawer = NavDrawer;
  exports.PickDate = PickDate;
  exports.SelectionControlFocus = SelectionControlFocus;
  exports.TabSwitch = TabSwitch;

  Object.defineProperty(exports, '__esModule', { value: true });

})));



