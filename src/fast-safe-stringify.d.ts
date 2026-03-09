declare module 'fast-safe-stringify' {
	function stringify(
		value: unknown,
		replacer?: (key: string, value: unknown) => unknown,
		space?: string | number,
		options?: {depthLimit: number | undefined; edgesLimit: number | undefined}
	): string;
	namespace stringify {
		function stable(
			value: unknown,
			replacer?: (key: string, value: unknown) => unknown,
			space?: string | number,
			options?: {depthLimit: number | undefined; edgesLimit: number | undefined}
		): string;
		function stableStringify(
			value: unknown,
			replacer?: (key: string, value: unknown) => unknown,
			space?: string | number,
			options?: {depthLimit: number | undefined; edgesLimit: number | undefined}
		): string;
	}
	export default stringify;
}
