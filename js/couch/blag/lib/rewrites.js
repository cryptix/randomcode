/**
 * Rewrite settings to be exported from the design doc
 
 ,
 {from: '*', to: '_show/not_found'}
 */

module.exports = [
    {from: '/static/*', to: 'static/*'},
    {from: '/', to: '_list/homepage/blogposts_by_created'},
    {from: '/:id', to: '_show/blogpost/:id'},
    {from: '*', to: '_show/not_found'}
];
