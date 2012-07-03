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
* CSS styling of form elements that are not included in the CSS3 UI 
  specification, but I think are useful for developers:
  
  - .wf2_isBlank, .wf2_notBlank – these classes are applied to form field when 
     a form element is blank/not blank repectively.
  - .wf2_lostFocus -this class is applied to a form element when a form field 
     loses focus.
  - .wf2_submitAttempted – this class is applied to a <form> tag when a form 
     submission is attempted.


More information about how this works is available at:

http://www.useragentman.com/blog/2010/07/27/cross-browser-html5-forms-using-modernizr-webforms2-and-html5widgets/
http://www.useragentman.com/blog/2012/05/14/cross-browser-styling-of-html5-forms-even-in-older-browsers/

Note that this package was originally released in 2010 as html5Widgets, 
and was renamed to a more accurate and descriptive name.  Also note that
the version of webforms2 that is included in this package does not 
include support for the depricated repetition module -- it will be 
put back in as a separate module at a later date.

