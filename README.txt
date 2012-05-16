HTML5Forms.js is a JavaScript polyfill that implements a subset of the HTML5
Forms module in all browsers.  The script will only add support for the
different parts of the module when there doesn't exist a native
implementation.  HTML5Forms supports the following HTML5 input types:

* range
* date
* datetime
* datetime-local
* week
* color

It also supports:

* form validation (via "required" and "pattern" attributes)
* the autofocus attribute (i.e. focusing on a particular form element onload)
* the placeholder attribute (i.e. descriptive text of what should be in a form
  field)
* the output tag (solves equations of form elements)
* CSS styling of form validation states (simulates :invalid and :valid in 
  unsupported browsers like IE9 and lower)

More information about how this works is available at:

http://www.useragentman.com/blog/2010/07/27/cross-browser-html5-forms-using-modernizr-webforms2-and-html5widgets/
http://www.useragentman.com/blog/2012/05/14/cross-browser-styling-of-html5-forms-even-in-older-browsers/

Note that this package was originally released in 2010 as html5Widgets, and was renamed 
to a more accurate and descriptive name.

