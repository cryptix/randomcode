define(
  [
    'components/flight/lib/component'
  ],

  function(defineComponent)  {

    return defineComponent(inbox);

    function inbox() {
      //define custom functions here
      //...

      // now initialize the component
      this.after('initialize', function() {
        this.on('click', doThisThing);
        this.on('mouseover', doThatThing);
      });
    }
  }
);