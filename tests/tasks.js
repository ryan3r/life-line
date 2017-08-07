import {Tasks} from "../../js/tasks";

describe("Tasks", function() {
	beforeEach(function() {
		// reset the database mock
		firebase.database().$reset();
	});

	it("can recieve add events from firebase", function() {
		// get the mock
		let db = firebase.database();

		let tasks = new Tasks("test");

		// make sure we get the correct ref
		expect(db._ref).to.be("/lists/test/tasks");

		// add a task
		db.$child_added({
			key: "test",
			val() {
				return {
					name: "My test"
				};
			}
		});

		// check that the task exists
		expect(tasks._tasks.get("test")).to.be.ok();

		// check that the name matches
		expect(tasks._tasks.get("test").name).to.be("My test");
	});

	it("can recieve add events from firebase (after the first load)", function() {
		// get the mock
		let db = firebase.database();

		let tasks = new Tasks("test");

		// make sure we get the correct ref
		expect(db._ref).to.be("/lists/test/tasks");

		// tell tasks that all of the tasks have been loaded
		db.$value();

		// add a task
		db.$child_added({
			key: "test",
			val() {
				return {
					name: "My test"
				};
			}
		});

		// check that the task exists
		expect(tasks._tasks.get("test")).to.be.ok();

		// check that the name matches
		expect(tasks._tasks.get("test").name).to.be("My test");
	});

	it("can recieve change events from firebase", function() {
		// get the mock
		let db = firebase.database();

		let tasks = new Tasks("test");

		// add a task
		db.$child_added({
			key: "test",
			val() {
				return {
					name: "My test"
				};
			}
		});

		let updateCalled = false;

		// override the task's update method
		tasks._tasks.get("test")._update = () => updateCalled = true;

		// modify that task
		db.$child_changed({
			key: "test",
			val() {
				return {
					name: "Changed!!!"
				};
			}
		});

		// check that update was called
		expect(updateCalled).to.be(true);
	});

	it("can recieve remove events from firebase", function() {
		// get the mock
		let db = firebase.database();

		let tasks = new Tasks("test");

		// add a task
		db.$child_added({
			key: "test",
			val() {
				return {
					name: "My test"
				};
			}
		});

		let removeCalled = false;

		// override the task's remove method
		tasks._tasks.get("test")._remove = () => removeCalled = true;

		// delete that task
		db.$child_removed({
			key: "test"
		});

		// check that remove was called
		expect(removeCalled).to.be(true);

		// check that the name matches
		expect(tasks._tasks.has("test")).to.be(false);
	});

	it("can tell when all the tasks have been loaded", function() {
		// get the mock
		let db = firebase.database();

		let tasks = new Tasks("test");

		// trigger the value event for firebase
		db.$value();

		return tasks.allLoaded;
	});

	it("can remove all listeners", function() {
		// get the mock
		let db = firebase.database();

		let tasks = new Tasks("test");

		// dispose of this tasks object
		tasks.dispose();

		// check that it called off
		expect(db._offed).to.be(true);
	});

	it("can get tasks (that have already been loaded)", function() {
		// get the mock
		let db = firebase.database();

		let tasks = new Tasks("test");

		// add the task
		db.$child_added({
			key: "test",
			val() {
				return {
					name: "My test"
				};
			}
		});

		// get the task
		return tasks.get("test")

		.then(task => {
			// check that the task is valid
			expect(task.name).to.be("My test");
		});
	});

	it("can get tasks (that have not been loaded yet)", function() {
		// get the mock
		let db = firebase.database();

		let tasks = new Tasks("test");

		// get the task
		const taskPromise = tasks.get("test");

		// add the task
		db.$child_added({
			key: "test",
			val() {
				return {
					name: "My test"
				};
			}
		});

		return taskPromise.then(task => {
			// check that the task is valid
			expect(task.name).to.be("My test");
		});
	});

	it("can get tasks throws when a task does not exist (called before load)", function() {
		let error;
		// get the mock
		let db = firebase.database();

		let tasks = new Tasks("test");

		// get the task
		const taskPromise = tasks.get("test");

		// trigger the all loaded event
		db.$value();

		return taskPromise
			// catch the error
			.catch(err => error = err)
			// check that an error was thrown
			.then(() => expect(error).to.be.ok());
	});

	it("can get tasks throws when a task does not exist (called after load)", function() {
		let error;
		// get the mock
		let db = firebase.database();

		let tasks = new Tasks("test");

		// trigger the all loaded event
		db.$value();

		return tasks.get("test")
			// catch the error
			.catch(err => error = err)
			// check that an error was thrown
			.then(() => expect(error).to.be.ok());
	});

	it("can create tasks", function() {
		// get the mock
		let db = firebase.database();

		let tasks = new Tasks("test");

		// create a new task
		const task = tasks.create({
			name: "Foo"
		});

		// check the returned tasks values
		expect(task.name).to.be("Foo");

		// check that task ended up in tasks
		expect(tasks._tasks.get(task.id)).to.eql(task);

		// check that the task was uploaded to firebase
		expect(db._children.get(task.id)._value.name).to.be("Foo");
	});

	it("can delete tasks", function() {
		// get the mock
		let db = firebase.database();

		let tasks = new Tasks("test");

		// create a new task
		let task = tasks.create({
			name: "Foo"
		});

		// delete the task
		tasks.delete(task.id);

		// check that task ended up in tasks
		expect(tasks._tasks.has(task.id)).to.not.be.ok();

		// check that the task was uploaded to firebase
		expect(db._children.get(task.id)._removed).to.be.ok();
	});

	it("can retreve the root task", function() {
		let tasks = new Tasks("test", "root");

		// swap out the get method
		tasks.get = function(id) {
			expect(id).to.be("root");

			return Promise.resolve("root-task");
		};

		// get the root
		return tasks.getRoot()

		.then(root => {
			expect(root).to.be("root-task");
		});
	});
});
