// button.js
define(
  [
    'flight/lib/component'
  ],

  function(defineComponent) {

    return defineComponent(button);

    function button() {
      this.defaultAttrs({
        buttonClass: 'js-button',
        text: 'Click me'
      });

      this.after('initialize', function() {
        //..
      });
    }

  }
);


// accessing attributes
this.after('initialize', function() {
  this.$node
      .addClass(this.attr.buttonClass)
      .text(this.attr.text);
});


// overriding options
define(
  [
    'components/button'
  ],

  function(Button) {
    Button.attachTo("#foo", {
      text: "Don't click me",
      buttonClass: "js-not-a-button"
    });
  }
);