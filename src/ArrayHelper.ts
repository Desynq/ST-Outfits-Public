

export namespace ArrayHelper {

	export function forPush<T, U>(inputArr: readonly T[], consumer: (x: T) => U): U[] {
		const outputArr: U[] = [];
		for (const input of inputArr) {
			outputArr.push(consumer(input));
		}
		return outputArr;
	}

}