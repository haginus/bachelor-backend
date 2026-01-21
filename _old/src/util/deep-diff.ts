import _ from 'lodash';

export function deepDiff(object: Record<any, any>, base: Record<any, any>) {
	function changes(object: Record<any, any>, base: Record<any, any>) {
		return _.transform(object, function(result, value, key) {
			if (!_.isEqual(value, base[key])) {
				result[key] = (_.isObject(value) && _.isObject(base[key]) && !_.isArray(value)) ? changes(value, base[key]) : value;
			}
		});
	}
	return changes(object, base);
}