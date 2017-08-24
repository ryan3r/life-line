const ID_BASE = 36;
const ID_RANDOM_LENGTH = 5;

// generate a unique id
export default function genId() {
	// get the date
	const date = Date.now().toString(ID_BASE);
	// get a random number
	const random = Math.random() * ID_BASE ** ID_RANDOM_LENGTH;

	return `${date}-${Math.floor(random).toString(ID_BASE)}`;
}
