/* attach an inbox component to a node with id 'inbox'*/

define(
  [
    'components/inbox',
    'components/searchBox'
  ],

  function(Inbox, SearchBox) {
    Inbox.attachTo('#inbox', {
      'nextPageSelector': '#nextPage',
      'previousPageSelector': '#previousPage'
    });

    SearchBox.attachTo('#searchbox', {
		'searchButton': '#searchButton' // might happen in its own initiator
    });
  }
);