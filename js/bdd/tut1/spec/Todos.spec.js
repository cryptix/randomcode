// Libs
var Backbone = require('backbone');
var sinon = require('sinon');

// mine
var models = require('../public/models.js');

describe('When instantiated with model literal', function() {
  beforeEach(function() {
    this.todos = new models.Todos();
    this.todos.add({ id:5, title: 'Foo' });
  });

  it('should add a model', function() {
    expect(this.todos.length).toEqual(1);
  });

  it('should find a model by id', function() {
    expect(this.todos.get(5).get('title')).toEqual('Foo');
  });

  describe('Ordering', function() {
    beforeEach(function() {
      this.todo1 = new Backbone.Model({id: 1, title: 'Todo 1', priority: 3});
      this.todo2 = new Backbone.Model({id: 2, title: 'Todo 2', priority: 2});
      this.todo3 = new Backbone.Model({id: 3, title: 'Todo 3', priority: 1});
    });

    it('should order models by priority', function() {
      this.todos.add([this.todo1, this.todo2, this.todo3]);

      expect(this.todos.at(0)).toBe(this.todo3);
      expect(this.todos.at(1)).toBe(this.todo2);
      expect(this.todos.at(2)).toBe(this.todo1);
    });
  });
});

describe('Fetching', function() {
  beforeEach(function() {
    this.server = sinon.fakeServer.create();
    this.todos = new models.Todos();
  });

  afterEach(function() {
    this.server.restore();
  });

  it('should make the correct request', function() {
    this.todos.fetch();

    expect(this.server.requests.length).toEqual(1);
    expect(this.server.requests[0].method).toEqual('GET');
    expect(this.server.requests[0].url).toEqual('/todos');
  });
});
