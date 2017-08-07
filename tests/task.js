import {Task} from "../../js/task";
import {genId} from "../../js/util";

// create a task list
const createTaskList = function(root) {
	let _tasks = new Map();

	// mock the task store
	let tasks = {
		_ref: firebase.database(),

		get(id) {
			return Promise.resolve(_tasks.get(id));
		}
	};

	// add the tasks to the storage
	const addTasks = function(task, parentId) {
		// generate an id for this task
		task.id || (task.id = genId());

		// add the children and get their ids
		if(task.children) {
			task.children = task.children.map(child => addTasks(child, task.id));
		}

		// add the parent id
		task.parent = parentId;

		// store this task
		_tasks.set(task.id, new Task(task, tasks));

		return task.id;
	}

	// start adding tasks
	const rootId = addTasks(root);

	// give back the root task
	return {
		tasks,
		root: _tasks.get(rootId)
	};
};

describe("Task", function() {
	beforeEach(function() {
		// reset the database mock
		firebase.database().$reset();
	});

	it("can store task properties", function() {
		// create a task
		const task = new Task({
			name: "Foo"
		});

		// check the name
		expect(task.name).to.be("Foo");
	});

	it("can recieve changes from data stores", function() {
		let tasks = {
			get() {
				return Promise.resolve();
			}
		};

		// create a task
		let task = new Task({
			name: "Foo"
		}, tasks);

		// update it
		task._update({
			name: "Bar"
		});

		// check the name
		expect(task.name).to.be("Bar");
	});

	it("emits property change events", function() {
		// set up tasks so name() has something to save to
		let tasks = {
			_ref: firebase.database()
		};

		let newName;
		// create a task
		let task = new Task({
			name: "Foo"
		}, tasks);

		// listen for changes
		task.on("name", info => newName = info.value);

		// change the name
		task.name = "Bar";

		expect(newName).to.be("Bar");
	});

	it("emits property change events from data stores", function() {
		let tasks = {
			get() {
				return Promise.resolve();
			}
		};

		let newName;
		// create a task
		let task = new Task({
			name: "Foo"
		}, tasks);

		// listen for changes
		task.on("name", info => newName = info.value);

		// change the name
		task._update({
			name: "Bar"
		});

		expect(newName).to.be("Bar");
	});

	it("emits removed events", function() {
		let removed = false;
		// create a task
		let task = new Task({
			name: "Foo"
		}, { // (Tasks)
			delete() {
				return Promise.resolve();
			},

			get() {
				return Promise.resolve();
			}
		});

		// listen for a remove event
		task.on("delete", () => removed = true);

		// remove the task
		task._remove();

		expect(removed).to.be(true);
	});

	it("can create child tasks", function() {
		let created;

		// mock tasks
		let tasks = {
			_ref: firebase.database(),

			create(raw) {
				created = raw;

				return Promise.resolve(new Task(raw));
			}
		};

		// create a task
		let task = new Task({ id: "parent" }, tasks);

		// create a child
		return task.create({ name: "Child" })

		.then(task => {
			// check that we pass on the new task
			expect(task).to.be.ok();

			// check the parent id passed to tasks
			expect(task._parentId).to.be("parent");
			// check the name passed to tasks
			expect(created.name).to.be("Child");
		});
	});

	it("can delete itself", function() {
		let deleted;

		// mock tasks
		let tasks = {
			get() {
				return Promise.resolve()
			},

			delete(id) {
				deleted = id;

				return Promise.resolve();
			}
		};

		// create a task
		let task = new Task({ id: "test" }, tasks);

		// delete that task
		return task.delete()

		.then(() => {
			// check the id passed to tasks
			expect(deleted).to.be("test");
		});
	});

	it("can iterate children", function() {
		// check that the children are loaded
		let tasks = {
			get(id) {
				// not requesting a task
				if(!id) return Promise.resolve();

				return Promise.resolve(`resolved-${id}`);
			}
		};

		// the test parent
		let task = new Task({
			children: [1, 2, 3]
		}, tasks);

		// the children send from forEach
		let iterated = [];

		// iterate the children
		return task.forEach(id => iterated.push(id))

		.then(() => {
			// verify that the children were loaded
			expect(iterated).to.eql(["resolved-1", "resolved-2", "resolved-3"]);
		});
	});

	it("can fetch the parent", function() {
		// check that the children are loaded
		let tasks = {
			get(id) {
				return Promise.resolve(`resolved-${id}`);
			}
		};

		// the test parent
		let task = new Task({
			parent: "parent"
		}, tasks);

		// get the parent
		return task.parent()

		.then(parent => {
			// verify that we have the correct parent
			expect(parent).to.be("resolved-parent");
		});
	});

	it("can send add child events", function() {
		let info;

		// handle the create event
		let tasks = {
			_ref: firebase.database(),

			create() {
				return Promise.resolve(
					new Task({ name: "task child" })
				);
			}
		};

		// a task for testing
		let task = new Task({
			name: "Foo"
		}, tasks);

		// listen to the add event
		task.on("attach-child", i => info = i);

		// create a child
		return task.create({ name: "Bar" })

		.then(() => {
			// verify the event info
			expect(info.target).to.eql(task);
			expect(info.child.name).to.be("task child");
		});
	});

	it("can send delete events", function() {
		let parentInfo, info;

		// handle the create event
		let tasks = {
			get(id) {
				return Promise.resolve(parent);
			},

			delete() {
				return Promise.resolve();
			}
		};

		// the parent task
		let parent = new Task({
			name: "parent"
		}, tasks);

		// a task for testing
		let task = new Task({
			name: "Foo",
			id: "parent"
		}, tasks);

		// listen to the remove child event
		parent.on("detach-child", i => parentInfo = i);

		// listen to the delete event
		task.on("delete", i => info = i);

		// create a child
		return task.delete()

		.then(() => {
			// check the target for the delete task
			expect(info.target).to.be(task);

			// check the info from the parent
			expect(parentInfo.target).to.be(parent);
			expect(parentInfo.child).to.be(task);
		});
	});

	it("can attach child tasks", function() {
		let tasks = {
			_ref: firebase.database()
		};

		let childAttached;

		// create a pair of tasks
		let parent = new Task({ name: "parent" }, tasks);
		let child = new Task({ name: "child" }, tasks);

		// listen for the attachment
		parent.on("attach-child", info => {
			// verify the info
			expect(info.target).to.be(parent);
			expect(info.child).to.be(child);

			childAttached = true;
		});

		// attach the child
		parent.attach(child);

		// verify that the event was called
		expect(childAttached).to.be.ok();

		// verify the parent and child are linked
		expect(parent._childIds.indexOf(child.id)).to.not.be(-1);
		expect(child._parentId).to.be(parent.id);
	});

	it("can detach child tasks", function() {
		let childDetached;

		let tasks = {
			_ref: firebase.database(),

			get() {
				return Promise.resolve(parent);
			}
		};

		// create a pair of tasks
		let parent = new Task({ name: "parent", children: ["child"], id: "parent" }, tasks);
		let child = new Task({ name: "child", id: "child", parent: "parent" }, tasks);

		// listen for the attachment
		parent.on("detach-child", info => {
			// verify the info
			expect(info.target).to.be(parent);
			expect(info.child).to.be(child);

			childDetached = true;
		});

		// attach the child
		return child.detach()

		.then(() => {
			// verify that the event was called
			expect(childDetached).to.be.ok();

			// verify the parent and child are linked
			expect(parent._childIds.indexOf(child.id)).to.be(-1);
			expect(child._parentId).to.not.be(parent.id);
		});
	});

	it("can save property changes to firebase", function() {
		// get the mock
		let db = firebase.database();

		// create a ref for the tasks
		let tasks = {
			_ref: db
		};

		// create a test task
		let task = new Task({ id: "test" }, tasks);

		// change the task
		task.name = "Foo";

		// check that the value was saved
		expect(db._children.get("test")._value.name).to.be("Foo");
	});

	it("can save attach calls to firebase", function() {
		// get the mock
		let db = firebase.database();

		// create a ref for the tasks
		let tasks = {
			_ref: db
		};

		// create a pair of tasks for testing
		let parent = new Task({ id: "parent" }, tasks);
		let child = new Task({ id: "child" }, tasks);

		// change the task
		parent.attach(child);

		// check that the changes were saved
		expect(db.child("child/parent")._value).to.be("parent");
		expect(db.child("parent/children/0")._value).to.be("child");
	});

	it("can save detach calls to firebase", function() {
		// get the mock
		let db = firebase.database();

		// create a ref for the tasks
		let tasks = {
			_ref: db,

			get() {
				return Promise.resolve(parent);
			}
		};

		// set the bound values in firebase
		db.child("child/parent")._value = "parent";
		db.child("parent/children/0")._value = "child";

		// create a pair of tasks for testing
		let parent = new Task({ id: "parent", children: ["child"] }, tasks);
		let child = new Task({ id: "child", parent: "parent" }, tasks);

		// change the task
		return child.detach()

		.then(() => {
			// check that the changes were saved
			expect(db.child("child/parent")._value).to.not.be("parent");
			expect(db.child("parent/children/0")._value).to.not.be("child");
		});
	});

	it("can delete itself and it's children", function() {
		let deleted = [];

		// create a task
		let {root: task, tasks} = createTaskList({
			id: "test",
			children: [{
				id: "foo"
			}]
		});

		// mock tasks
		tasks.delete = function(id) {
			deleted.push(id);

			return Promise.resolve();
		};

		// delete that task
		return task.delete()

		.then(() => {
			// check the id passed to tasks
			expect(deleted.indexOf("test")).to.not.be(-1);
			expect(deleted.indexOf("foo")).to.not.be(-1);
		});
	});

	describe("State rules", function() {
		it("can get the state of a childless task", function() {
			const task = new Task({ state: "done" });

			return task.getState().then(state => {
				// check the state
				expect(state).to.eql({
					type: "done",
					percentDone: 1
				});
			});
		});

		const STATES = ["none", "pending", "done"];

		// test it on each state
		STATES.forEach($state => {
			it(`can get the state of a parent task with 1 child (${$state})`, function() {
				const {root: parent} = createTaskList({
					name: "parent",
					children: [
						{ name: "Child 1", state: $state }
					]
				});

				return parent.getState().then(state => {
					// check the state
					expect(state).to.eql({
						type: $state,
						percentDone: $state == "done" ? 1 : 0
					});
				});
			});
		});

		function twoChildren(child1, child2, $state, percDone) {
			it(`can get the state of a parent task with 2 children (${child1}, ${child2})`, function() {
				const {root: parent} = createTaskList({
					name: "parent",
					children: [
						{ name: "Child 1", state: child1 },
						{ name: "Child 2", state: child2 }
					]
				});

				return parent.getState().then(state => {
					// check the state
					expect(state).to.eql({
						type: $state,
						percentDone: percDone
					});
				});
			});
		}

		twoChildren("done", "done", "done", 1);
		twoChildren("pending", "done", "pending", 0.5);
		twoChildren("pending", "none", "none", 0);
		twoChildren("done", "none", "none", 0.5);

		it("can get the state of a parent task with 3 children (none, pending, done)", function() {
			const {root: parent} = createTaskList({
				name: "parent",
				children: [
					{ name: "Child 1", state: "none" },
					{ name: "Child 2", state: "pending" },
					{ name: "Child 3", state: "done" },
				]
			});

			return parent.getState().then(state => {
				// check the state
				expect(state).to.eql({
					type: "none",
					percentDone: 1 / 3
				});
			});
		});

		it("can get the state of a grand parent task", function() {
			const {root: parent} = createTaskList({
				name: "parent",
				children: [
					{ name: "Child 1", state: "pending" },
					{ name: "Child 2", state: "pending" },
					{
						name: "Child 3",
						children: [
							{ name: "Grandchild 1", state: "done" },
							{ name: "Grandchild 1", state: "none" },
						]
					},
				]
			});

			return parent.getState().then(state => {
				// check the state
				expect(state).to.eql({
					type: "none",
					percentDone: 1 / 6
				});
			});
		});

		it("can set the state of a child task", function() {
			let {root: task} = createTaskList({ name: "Foo" });

			// set the state
			return task.setState("none")

			// get the state
			.then(() => task.getState())

			.then(state => {
				// check the state
				expect(state).to.eql({
					type: "none",
					percentDone: 0
				});
			})
		});

		it("can update the state of a parent when a child is set (state change)", function() {
			let {root: parent, tasks} = createTaskList({
				name: "parent",
				children: [
					{ name: "Child 1", state: "none" },
					{ name: "Child 2", state: "pending" },
					{ name: "Child 3", state: "done" },
				]
			});

			// get the child
			return tasks.get(parent._childIds[0])

			// set the state
			.then(task => task.setState("pending"))

			// get the state
			.then(() => parent.getState())

			.then(state => {
				// check the state
				expect(state).to.eql({
					type: "pending",
					percentDone:  1 / 3
				});
			})
		});

		it("can update the state of a parent when a child is set (percent done change)", function() {
			let {root: parent, tasks} = createTaskList({
				name: "parent",
				children: [
					{ name: "Child 1", state: "none" },
					{ name: "Child 2", state: "pending" },
					{ name: "Child 3", state: "done" },
				]
			});

			// calculate the parent state so the change triggers a recalcuation
			parent.getState();

			// get the child
			return tasks.get(parent._childIds[1])

			// set the state
			.then(task => task.setState("done"))

			// get the state
			.then(() => parent.getState())

			.then(state => {
				// check the state
				expect(state).to.eql({
					type: "none",
					percentDone:  2 / 3
				});
			})
		});

		it("emits state change events", function() {
			let stateChanged = false;

			let {root: task} = createTaskList({
				name: "parent"
			});

			// listen for changes
			task.on("state", state => {
				// verify the state
				expect(state.value).to.eql({
					type: "pending",
					percentDone: 0
				});

				stateChanged = true;
			});

			// change the state
			return task.setState("pending")

			.then(() => {
				// make sure the event was emitted
				expect(stateChanged).to.be.ok();
			});
		});

		it("emits state change events for the parent", function() {
			let stateChanged = false;

			let {root: parent, tasks} = createTaskList({
				name: "parent",
				children: [
					{ name: "Child 1", state: "none" },
					{ name: "Child 2", state: "pending" },
					{ name: "Child 3", state: "done" },
				]
			});

			// listen for changes
			parent.on("state", state => {
				// verify the state
				expect(state.value).to.eql({
					type: "none",
					percentDone: 2 / 3
				});

				stateChanged = true;
			});

			// get the child
			return tasks.get(parent._childIds[1])

			// set the state
			.then(task => task.setState("done"))

			.then(() => {
				// make sure the event was emitted
				expect(stateChanged).to.be.ok();
			});
		});
	});
});
