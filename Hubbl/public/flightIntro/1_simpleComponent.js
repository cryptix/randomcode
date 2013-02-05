define(
	[
	'components/flight/lib/component'
	],
function(defineComponent) {
	return defineComponent(simpleComponent);

	function simpleComponent() {
		this.doSomething = function() {
			//...
		};

		this.doSomethingElse = function() {
			// ....
		};
	}
});