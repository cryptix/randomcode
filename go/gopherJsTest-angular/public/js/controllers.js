"use strict";
(function() {

Error.stackTraceLimit = -1;

var $global;
if (typeof window !== "undefined") { /* web page */
	$global = window;
} else if (typeof self !== "undefined") { /* web worker */
	$global = self;
} else if (typeof global !== "undefined") { /* Node.js */
	$global = global;
	$global.require = require;
} else {
	console.log("warning: no global object found")
}

var $idCounter = 0;
var $keys = function(m) { return m ? Object.keys(m) : []; };
var $min = Math.min;
var $parseInt = parseInt;
var $parseFloat = function(f) {
	if (f.constructor === Number) {
		return f;
	}
	return parseFloat(f);
};
var $mod = function(x, y) { return x % y; };
var $toString = String;
var $reflect, $newStringPtr;
var $Array = Array;

var $floatKey = function(f) {
	if (f !== f) {
		$idCounter++;
		return "NaN$" + $idCounter;
	}
	return String(f);
};

var $mapArray = function(array, f) {
	var newArray = new array.constructor(array.length), i;
	for (i = 0; i < array.length; i++) {
		newArray[i] = f(array[i]);
	}
	return newArray;
};

var $newType = function(size, kind, string, name, pkgPath, constructor) {
	var typ;
	switch(kind) {
	case "Bool":
	case "Int":
	case "Int8":
	case "Int16":
	case "Int32":
	case "Uint":
	case "Uint8" :
	case "Uint16":
	case "Uint32":
	case "Uintptr":
	case "String":
	case "UnsafePointer":
		typ = function(v) { this.$val = v; };
		typ.prototype.$key = function() { return string + "$" + this.$val; };
		break;

	case "Float32":
	case "Float64":
		typ = function(v) { this.$val = v; };
		typ.prototype.$key = function() { return string + "$" + $floatKey(this.$val); };
		break;

	case "Int64":
		typ = function(high, low) {
			this.high = (high + Math.floor(Math.ceil(low) / 4294967296)) >> 0;
			this.low = low >>> 0;
			this.$val = this;
		};
		typ.prototype.$key = function() { return string + "$" + this.high + "$" + this.low; };
		break;

	case "Uint64":
		typ = function(high, low) {
			this.high = (high + Math.floor(Math.ceil(low) / 4294967296)) >>> 0;
			this.low = low >>> 0;
			this.$val = this;
		};
		typ.prototype.$key = function() { return string + "$" + this.high + "$" + this.low; };
		break;

	case "Complex64":
	case "Complex128":
		typ = function(real, imag) {
			this.real = real;
			this.imag = imag;
			this.$val = this;
		};
		typ.prototype.$key = function() { return string + "$" + this.real + "$" + this.imag; };
		break;

	case "Array":
		typ = function(v) { this.$val = v; };
		typ.Ptr = $newType(4, "Ptr", "*" + string, "", "", function(array) {
			this.$get = function() { return array; };
			this.$val = array;
		});
		typ.init = function(elem, len) {
			typ.elem = elem;
			typ.len = len;
			typ.prototype.$key = function() {
				return string + "$" + Array.prototype.join.call($mapArray(this.$val, function(e) {
					var key = e.$key ? e.$key() : String(e);
					return key.replace(/\\/g, "\\\\").replace(/\$/g, "\\$");
				}), "$");
			};
			typ.extendReflectType = function(rt) {
				rt.arrayType = new $reflect.arrayType.Ptr(rt, elem.reflectType(), undefined, len);
			};
			typ.Ptr.init(typ);
		};
		break;

	case "Chan":
		typ = function() { this.$val = this; };
		typ.prototype.$key = function() {
			if (this.$id === undefined) {
				$idCounter++;
				this.$id = $idCounter;
			}
			return String(this.$id);
		};
		typ.init = function(elem, sendOnly, recvOnly) {
			typ.nil = new typ();
			typ.extendReflectType = function(rt) {
				rt.chanType = new $reflect.chanType.Ptr(rt, elem.reflectType(), sendOnly ? $reflect.SendDir : (recvOnly ? $reflect.RecvDir : $reflect.BothDir));
			};
		};
		break;

	case "Func":
		typ = function(v) { this.$val = v; };
		typ.init = function(params, results, variadic) {
			typ.params = params;
			typ.results = results;
			typ.variadic = variadic;
			typ.extendReflectType = function(rt) {
				var typeSlice = ($sliceType($ptrType($reflect.rtype.Ptr)));
				rt.funcType = new $reflect.funcType.Ptr(rt, variadic, new typeSlice($mapArray(params, function(p) { return p.reflectType(); })), new typeSlice($mapArray(results, function(p) { return p.reflectType(); })));
			};
		};
		break;

	case "Interface":
		typ = { implementedBy: [] };
		typ.init = function(methods) {
			typ.methods = methods;
			typ.extendReflectType = function(rt) {
				var imethods = $mapArray(methods, function(m) {
					return new $reflect.imethod.Ptr($newStringPtr(m[1]), $newStringPtr(m[2]), $funcType(m[3], m[4], m[5]).reflectType());
				});
				var methodSlice = ($sliceType($ptrType($reflect.imethod.Ptr)));
				rt.interfaceType = new $reflect.interfaceType.Ptr(rt, new methodSlice(imethods));
			};
		};
		break;

	case "Map":
		typ = function(v) { this.$val = v; };
		typ.init = function(key, elem) {
			typ.key = key;
			typ.elem = elem;
			typ.extendReflectType = function(rt) {
				rt.mapType = new $reflect.mapType.Ptr(rt, key.reflectType(), elem.reflectType(), undefined, undefined);
			};
		};
		break;

	case "Ptr":
		typ = constructor || function(getter, setter) {
			this.$get = getter;
			this.$set = setter;
			this.$val = this;
		};
		typ.prototype.$key = function() {
			if (this.$id === undefined) {
				$idCounter++;
				this.$id = $idCounter;
			}
			return String(this.$id);
		};
		typ.init = function(elem) {
			typ.nil = new typ($throwNilPointerError, $throwNilPointerError);
			typ.extendReflectType = function(rt) {
				rt.ptrType = new $reflect.ptrType.Ptr(rt, elem.reflectType());
			};
		};
		break;

	case "Slice":
		var nativeArray;
		typ = function(array) {
			if (array.constructor !== nativeArray) {
				array = new nativeArray(array);
			}
			this.array = array;
			this.offset = 0;
			this.length = array.length;
			this.capacity = array.length;
			this.$val = this;
		};
		typ.make = function(length, capacity, zero) {
			capacity = capacity || length;
			var array = new nativeArray(capacity), i;
			for (i = 0; i < capacity; i++) {
				array[i] = zero();
			}
			var slice = new typ(array);
			slice.length = length;
			return slice;
		};
		typ.init = function(elem) {
			typ.elem = elem;
			nativeArray = $nativeArray(elem.kind);
			typ.nil = new typ([]);
			typ.extendReflectType = function(rt) {
				rt.sliceType = new $reflect.sliceType.Ptr(rt, elem.reflectType());
			};
		};
		break;

	case "Struct":
		typ = function(v) { this.$val = v; };
		typ.Ptr = $newType(4, "Ptr", "*" + string, "", "", constructor);
		typ.Ptr.Struct = typ;
		typ.init = function(fields) {
			var i;
			typ.fields = fields;
			typ.Ptr.init(typ);
			/* nil value */
			typ.Ptr.nil = new constructor();
			for (i = 0; i < fields.length; i++) {
				var field = fields[i];
				Object.defineProperty(typ.Ptr.nil, field[1], { get: $throwNilPointerError, set: $throwNilPointerError });
			}
			/* methods for embedded fields */
			for (i = 0; i < typ.methods.length; i++) {
				var method = typ.methods[i];
				if (method[6] != -1) {
					(function(field, methodName) {
						typ.prototype[methodName] = function() {
							var v = this.$val[field[0]];
							return v[methodName].apply(v, arguments);
						};
					})(fields[method[6]], method[0]);
				}
			}
			for (i = 0; i < typ.Ptr.methods.length; i++) {
				var method = typ.Ptr.methods[i];
				if (method[6] != -1) {
					(function(field, methodName) {
						typ.Ptr.prototype[methodName] = function() {
							var v = this[field[0]];
							if (v.$val === undefined) {
								v = new field[3](v);
							}
							return v[methodName].apply(v, arguments);
						};
					})(fields[method[6]], method[0]);
				}
			}
			/* map key */
			typ.prototype.$key = function() {
				var keys = new Array(fields.length);
				for (i = 0; i < fields.length; i++) {
					var v = this.$val[fields[i][0]];
					var key = v.$key ? v.$key() : String(v);
					keys[i] = key.replace(/\\/g, "\\\\").replace(/\$/g, "\\$");
				}
				return string + "$" + keys.join("$");
			};
			/* reflect type */
			typ.extendReflectType = function(rt) {
				var reflectFields = new Array(fields.length), i;
				for (i = 0; i < fields.length; i++) {
					var field = fields[i];
					reflectFields[i] = new $reflect.structField.Ptr($newStringPtr(field[1]), $newStringPtr(field[2]), field[3].reflectType(), $newStringPtr(field[4]), i);
				}
				rt.structType = new $reflect.structType.Ptr(rt, new ($sliceType($reflect.structField.Ptr))(reflectFields));
			};
		};
		break;

	default:
		throw $panic(new $String("invalid kind: " + kind));
	}

	typ.kind = kind;
	typ.string = string;
	typ.typeName = name;
	typ.pkgPath = pkgPath;
	typ.methods = [];
	var rt = null;
	typ.reflectType = function() {
		if (rt === null) {
			rt = new $reflect.rtype.Ptr(size, 0, 0, 0, 0, $reflect.kinds[kind], undefined, undefined, $newStringPtr(string), undefined, undefined);
			rt.jsType = typ;

			var methods = [];
			if (typ.methods !== undefined) {
				var i;
				for (i = 0; i < typ.methods.length; i++) {
					var m = typ.methods[i];
					methods.push(new $reflect.method.Ptr($newStringPtr(m[1]), $newStringPtr(m[2]), $funcType(m[3], m[4], m[5]).reflectType(), $funcType([typ].concat(m[3]), m[4], m[5]).reflectType(), undefined, undefined));
				}
			}
			if (name !== "" || methods.length !== 0) {
				var methodSlice = ($sliceType($ptrType($reflect.method.Ptr)));
				rt.uncommonType = new $reflect.uncommonType.Ptr($newStringPtr(name), $newStringPtr(pkgPath), new methodSlice(methods));
				rt.uncommonType.jsType = typ;
			}

			if (typ.extendReflectType !== undefined) {
				typ.extendReflectType(rt);
			}
		}
		return rt;
	};
	return typ;
};

var $Bool          = $newType( 1, "Bool",          "bool",           "bool",       "", null);
var $Int           = $newType( 4, "Int",           "int",            "int",        "", null);
var $Int8          = $newType( 1, "Int8",          "int8",           "int8",       "", null);
var $Int16         = $newType( 2, "Int16",         "int16",          "int16",      "", null);
var $Int32         = $newType( 4, "Int32",         "int32",          "int32",      "", null);
var $Int64         = $newType( 8, "Int64",         "int64",          "int64",      "", null);
var $Uint          = $newType( 4, "Uint",          "uint",           "uint",       "", null);
var $Uint8         = $newType( 1, "Uint8",         "uint8",          "uint8",      "", null);
var $Uint16        = $newType( 2, "Uint16",        "uint16",         "uint16",     "", null);
var $Uint32        = $newType( 4, "Uint32",        "uint32",         "uint32",     "", null);
var $Uint64        = $newType( 8, "Uint64",        "uint64",         "uint64",     "", null);
var $Uintptr       = $newType( 4, "Uintptr",       "uintptr",        "uintptr",    "", null);
var $Float32       = $newType( 4, "Float32",       "float32",        "float32",    "", null);
var $Float64       = $newType( 8, "Float64",       "float64",        "float64",    "", null);
var $Complex64     = $newType( 8, "Complex64",     "complex64",      "complex64",  "", null);
var $Complex128    = $newType(16, "Complex128",    "complex128",     "complex128", "", null);
var $String        = $newType( 8, "String",        "string",         "string",     "", null);
var $UnsafePointer = $newType( 4, "UnsafePointer", "unsafe.Pointer", "Pointer",    "", null);

var $nativeArray = function(elemKind) {
	return ({ Int: Int32Array, Int8: Int8Array, Int16: Int16Array, Int32: Int32Array, Uint: Uint32Array, Uint8: Uint8Array, Uint16: Uint16Array, Uint32: Uint32Array, Uintptr: Uint32Array, Float32: Float32Array, Float64: Float64Array })[elemKind] || Array;
};
var $toNativeArray = function(elemKind, array) {
	var nativeArray = $nativeArray(elemKind);
	if (nativeArray === Array) {
		return array;
	}
	return new nativeArray(array);
};
var $makeNativeArray = function(elemKind, length, zero) {
	var array = new ($nativeArray(elemKind))(length), i;
	for (i = 0; i < length; i++) {
		array[i] = zero();
	}
	return array;
};
var $arrayTypes = {};
var $arrayType = function(elem, len) {
	var string = "[" + len + "]" + elem.string;
	var typ = $arrayTypes[string];
	if (typ === undefined) {
		typ = $newType(12, "Array", string, "", "", null);
		typ.init(elem, len);
		$arrayTypes[string] = typ;
	}
	return typ;
};

var $chanType = function(elem, sendOnly, recvOnly) {
	var string = (recvOnly ? "<-" : "") + "chan" + (sendOnly ? "<- " : " ") + elem.string;
	var field = sendOnly ? "SendChan" : (recvOnly ? "RecvChan" : "Chan");
	var typ = elem[field];
	if (typ === undefined) {
		typ = $newType(4, "Chan", string, "", "", null);
		typ.init(elem, sendOnly, recvOnly);
		elem[field] = typ;
	}
	return typ;
};

var $funcSig = function(params, results, variadic) {
	var paramTypes = $mapArray(params, function(p) { return p.string; });
	if (variadic) {
		paramTypes[paramTypes.length - 1] = "..." + paramTypes[paramTypes.length - 1].substr(2);
	}
	var string = "(" + paramTypes.join(", ") + ")";
	if (results.length === 1) {
		string += " " + results[0].string;
	} else if (results.length > 1) {
		string += " (" + $mapArray(results, function(r) { return r.string; }).join(", ") + ")";
	}
	return string;
};

var $funcTypes = {};
var $funcType = function(params, results, variadic) {
	var string = "func" + $funcSig(params, results, variadic);
	var typ = $funcTypes[string];
	if (typ === undefined) {
		typ = $newType(4, "Func", string, "", "", null);
		typ.init(params, results, variadic);
		$funcTypes[string] = typ;
	}
	return typ;
};

var $interfaceTypes = {};
var $interfaceType = function(methods) {
	var string = "interface {}";
	if (methods.length !== 0) {
		string = "interface { " + $mapArray(methods, function(m) {
			return (m[2] !== "" ? m[2] + "." : "") + m[1] + $funcSig(m[3], m[4], m[5]);
		}).join("; ") + " }";
	}
	var typ = $interfaceTypes[string];
	if (typ === undefined) {
		typ = $newType(8, "Interface", string, "", "", null);
		typ.init(methods);
		$interfaceTypes[string] = typ;
	}
	return typ;
};
var $emptyInterface = $interfaceType([]);
var $interfaceNil = { $key: function() { return "nil"; } };
var $error = $newType(8, "Interface", "error", "error", "", null);
$error.init([["Error", "Error", "", [], [$String], false]]);

var $Map = function() {};
(function() {
	var names = Object.getOwnPropertyNames(Object.prototype), i;
	for (i = 0; i < names.length; i++) {
		$Map.prototype[names[i]] = undefined;
	}
})();
var $mapTypes = {};
var $mapType = function(key, elem) {
	var string = "map[" + key.string + "]" + elem.string;
	var typ = $mapTypes[string];
	if (typ === undefined) {
		typ = $newType(4, "Map", string, "", "", null);
		typ.init(key, elem);
		$mapTypes[string] = typ;
	}
	return typ;
};

var $throwNilPointerError = function() { $throwRuntimeError("invalid memory address or nil pointer dereference"); };
var $ptrType = function(elem) {
	var typ = elem.Ptr;
	if (typ === undefined) {
		typ = $newType(4, "Ptr", "*" + elem.string, "", "", null);
		typ.init(elem);
		elem.Ptr = typ;
	}
	return typ;
};

var $sliceType = function(elem) {
	var typ = elem.Slice;
	if (typ === undefined) {
		typ = $newType(12, "Slice", "[]" + elem.string, "", "", null);
		typ.init(elem);
		elem.Slice = typ;
	}
	return typ;
};

var $structTypes = {};
var $structType = function(fields) {
	var string = "struct { " + $mapArray(fields, function(f) {
		return f[1] + " " + f[3].string + (f[4] !== "" ? (" \"" + f[4].replace(/\\/g, "\\\\").replace(/"/g, "\\\"") + "\"") : "");
	}).join("; ") + " }";
	var typ = $structTypes[string];
	if (typ === undefined) {
		typ = $newType(0, "Struct", string, "", "", function() {
			this.$val = this;
			var i;
			for (i = 0; i < fields.length; i++) {
				this[fields[i][0]] = arguments[i];
			}
		});
		/* collect methods for anonymous fields */
		var i, j;
		for (i = 0; i < fields.length; i++) {
			var field = fields[i];
			if (field[1] === "") {
				var methods = field[3].methods;
				for (j = 0; j < methods.length; j++) {
					var m = methods[j].slice(0, 6).concat([i]);
					typ.methods.push(m);
					typ.Ptr.methods.push(m);
				}
				if (field[3].kind === "Struct") {
					var methods = field[3].Ptr.methods;
					for (j = 0; j < methods.length; j++) {
						typ.Ptr.methods.push(methods[j].slice(0, 6).concat([i]));
					}
				}
			}
		}
		typ.init(fields);
		$structTypes[string] = typ;
	}
	return typ;
};

var $stringPtrMap = new $Map();
$newStringPtr = function(str) {
	if (str === undefined || str === "") {
		return $ptrType($String).nil;
	}
	var ptr = $stringPtrMap[str];
	if (ptr === undefined) {
		ptr = new ($ptrType($String))(function() { return str; }, function(v) { str = v; });
		$stringPtrMap[str] = ptr;
	}
	return ptr;
};
var $newDataPointer = function(data, constructor) {
	return new constructor(function() { return data; }, function(v) { data = v; });
};

var $coerceFloat32 = function(f) {
	var math = $packages["math"];
	if (math === undefined) {
		return f;
	}
	return math.Float32frombits(math.Float32bits(f));
};
var $flatten64 = function(x) {
	return x.high * 4294967296 + x.low;
};
var $shiftLeft64 = function(x, y) {
	if (y === 0) {
		return x;
	}
	if (y < 32) {
		return new x.constructor(x.high << y | x.low >>> (32 - y), (x.low << y) >>> 0);
	}
	if (y < 64) {
		return new x.constructor(x.low << (y - 32), 0);
	}
	return new x.constructor(0, 0);
};
var $shiftRightInt64 = function(x, y) {
	if (y === 0) {
		return x;
	}
	if (y < 32) {
		return new x.constructor(x.high >> y, (x.low >>> y | x.high << (32 - y)) >>> 0);
	}
	if (y < 64) {
		return new x.constructor(x.high >> 31, (x.high >> (y - 32)) >>> 0);
	}
	if (x.high < 0) {
		return new x.constructor(-1, 4294967295);
	}
	return new x.constructor(0, 0);
};
var $shiftRightUint64 = function(x, y) {
	if (y === 0) {
		return x;
	}
	if (y < 32) {
		return new x.constructor(x.high >>> y, (x.low >>> y | x.high << (32 - y)) >>> 0);
	}
	if (y < 64) {
		return new x.constructor(0, x.high >>> (y - 32));
	}
	return new x.constructor(0, 0);
};
var $mul64 = function(x, y) {
	var high = 0, low = 0, i;
	if ((y.low & 1) !== 0) {
		high = x.high;
		low = x.low;
	}
	for (i = 1; i < 32; i++) {
		if ((y.low & 1<<i) !== 0) {
			high += x.high << i | x.low >>> (32 - i);
			low += (x.low << i) >>> 0;
		}
	}
	for (i = 0; i < 32; i++) {
		if ((y.high & 1<<i) !== 0) {
			high += x.low << i;
		}
	}
	return new x.constructor(high, low);
};
var $div64 = function(x, y, returnRemainder) {
	if (y.high === 0 && y.low === 0) {
		$throwRuntimeError("integer divide by zero");
	}

	var s = 1;
	var rs = 1;

	var xHigh = x.high;
	var xLow = x.low;
	if (xHigh < 0) {
		s = -1;
		rs = -1;
		xHigh = -xHigh;
		if (xLow !== 0) {
			xHigh--;
			xLow = 4294967296 - xLow;
		}
	}

	var yHigh = y.high;
	var yLow = y.low;
	if (y.high < 0) {
		s *= -1;
		yHigh = -yHigh;
		if (yLow !== 0) {
			yHigh--;
			yLow = 4294967296 - yLow;
		}
	}

	var high = 0, low = 0, n = 0, i;
	while (yHigh < 2147483648 && ((xHigh > yHigh) || (xHigh === yHigh && xLow > yLow))) {
		yHigh = (yHigh << 1 | yLow >>> 31) >>> 0;
		yLow = (yLow << 1) >>> 0;
		n++;
	}
	for (i = 0; i <= n; i++) {
		high = high << 1 | low >>> 31;
		low = (low << 1) >>> 0;
		if ((xHigh > yHigh) || (xHigh === yHigh && xLow >= yLow)) {
			xHigh = xHigh - yHigh;
			xLow = xLow - yLow;
			if (xLow < 0) {
				xHigh--;
				xLow += 4294967296;
			}
			low++;
			if (low === 4294967296) {
				high++;
				low = 0;
			}
		}
		yLow = (yLow >>> 1 | yHigh << (32 - 1)) >>> 0;
		yHigh = yHigh >>> 1;
	}

	if (returnRemainder) {
		return new x.constructor(xHigh * rs, xLow * rs);
	}
	return new x.constructor(high * s, low * s);
};

var $divComplex = function(n, d) {
	var ninf = n.real === 1/0 || n.real === -1/0 || n.imag === 1/0 || n.imag === -1/0;
	var dinf = d.real === 1/0 || d.real === -1/0 || d.imag === 1/0 || d.imag === -1/0;
	var nnan = !ninf && (n.real !== n.real || n.imag !== n.imag);
	var dnan = !dinf && (d.real !== d.real || d.imag !== d.imag);
	if(nnan || dnan) {
		return new n.constructor(0/0, 0/0);
	}
	if (ninf && !dinf) {
		return new n.constructor(1/0, 1/0);
	}
	if (!ninf && dinf) {
		return new n.constructor(0, 0);
	}
	if (d.real === 0 && d.imag === 0) {
		if (n.real === 0 && n.imag === 0) {
			return new n.constructor(0/0, 0/0);
		}
		return new n.constructor(1/0, 1/0);
	}
	var a = Math.abs(d.real);
	var b = Math.abs(d.imag);
	if (a <= b) {
		var ratio = d.real / d.imag;
		var denom = d.real * ratio + d.imag;
		return new n.constructor((n.real * ratio + n.imag) / denom, (n.imag * ratio - n.real) / denom);
	}
	var ratio = d.imag / d.real;
	var denom = d.imag * ratio + d.real;
	return new n.constructor((n.imag * ratio + n.real) / denom, (n.imag - n.real * ratio) / denom);
};

var $subslice = function(slice, low, high, max) {
	if (low < 0 || high < low || max < high || high > slice.capacity || max > slice.capacity) {
		$throwRuntimeError("slice bounds out of range");
	}
	var s = new slice.constructor(slice.array);
	s.offset = slice.offset + low;
	s.length = slice.length - low;
	s.capacity = slice.capacity - low;
	if (high !== undefined) {
		s.length = high - low;
	}
	if (max !== undefined) {
		s.capacity = max - low;
	}
	return s;
};

var $sliceToArray = function(slice) {
	if (slice.length === 0) {
		return [];
	}
	if (slice.array.constructor !== Array) {
		return slice.array.subarray(slice.offset, slice.offset + slice.length);
	}
	return slice.array.slice(slice.offset, slice.offset + slice.length);
};

var $decodeRune = function(str, pos) {
	var c0 = str.charCodeAt(pos);

	if (c0 < 0x80) {
		return [c0, 1];
	}

	if (c0 !== c0 || c0 < 0xC0) {
		return [0xFFFD, 1];
	}

	var c1 = str.charCodeAt(pos + 1);
	if (c1 !== c1 || c1 < 0x80 || 0xC0 <= c1) {
		return [0xFFFD, 1];
	}

	if (c0 < 0xE0) {
		var r = (c0 & 0x1F) << 6 | (c1 & 0x3F);
		if (r <= 0x7F) {
			return [0xFFFD, 1];
		}
		return [r, 2];
	}

	var c2 = str.charCodeAt(pos + 2);
	if (c2 !== c2 || c2 < 0x80 || 0xC0 <= c2) {
		return [0xFFFD, 1];
	}

	if (c0 < 0xF0) {
		var r = (c0 & 0x0F) << 12 | (c1 & 0x3F) << 6 | (c2 & 0x3F);
		if (r <= 0x7FF) {
			return [0xFFFD, 1];
		}
		if (0xD800 <= r && r <= 0xDFFF) {
			return [0xFFFD, 1];
		}
		return [r, 3];
	}

	var c3 = str.charCodeAt(pos + 3);
	if (c3 !== c3 || c3 < 0x80 || 0xC0 <= c3) {
		return [0xFFFD, 1];
	}

	if (c0 < 0xF8) {
		var r = (c0 & 0x07) << 18 | (c1 & 0x3F) << 12 | (c2 & 0x3F) << 6 | (c3 & 0x3F);
		if (r <= 0xFFFF || 0x10FFFF < r) {
			return [0xFFFD, 1];
		}
		return [r, 4];
	}

	return [0xFFFD, 1];
};

var $encodeRune = function(r) {
	if (r < 0 || r > 0x10FFFF || (0xD800 <= r && r <= 0xDFFF)) {
		r = 0xFFFD;
	}
	if (r <= 0x7F) {
		return String.fromCharCode(r);
	}
	if (r <= 0x7FF) {
		return String.fromCharCode(0xC0 | r >> 6, 0x80 | (r & 0x3F));
	}
	if (r <= 0xFFFF) {
		return String.fromCharCode(0xE0 | r >> 12, 0x80 | (r >> 6 & 0x3F), 0x80 | (r & 0x3F));
	}
	return String.fromCharCode(0xF0 | r >> 18, 0x80 | (r >> 12 & 0x3F), 0x80 | (r >> 6 & 0x3F), 0x80 | (r & 0x3F));
};

var $stringToBytes = function(str, terminateWithNull) {
	var array = new Uint8Array(terminateWithNull ? str.length + 1 : str.length), i;
	for (i = 0; i < str.length; i++) {
		array[i] = str.charCodeAt(i);
	}
	if (terminateWithNull) {
		array[str.length] = 0;
	}
	return array;
};

var $bytesToString = function(slice) {
	if (slice.length === 0) {
		return "";
	}
	var str = "", i;
	for (i = 0; i < slice.length; i += 10000) {
		str += String.fromCharCode.apply(null, slice.array.subarray(slice.offset + i, slice.offset + Math.min(slice.length, i + 10000)));
	}
	return str;
};

var $stringToRunes = function(str) {
	var array = new Int32Array(str.length);
	var rune, i, j = 0;
	for (i = 0; i < str.length; i += rune[1], j++) {
		rune = $decodeRune(str, i);
		array[j] = rune[0];
	}
	return array.subarray(0, j);
};

var $runesToString = function(slice) {
	if (slice.length === 0) {
		return "";
	}
	var str = "", i;
	for (i = 0; i < slice.length; i++) {
		str += $encodeRune(slice.array[slice.offset + i]);
	}
	return str;
};

var $needsExternalization = function(t) {
	switch (t.kind) {
		case "Int64":
		case "Uint64":
		case "Array":
		case "Func":
		case "Map":
		case "Slice":
		case "String":
			return true;
		case "Interface":
			return t !== $packages["github.com/gopherjs/gopherjs/js"].Object;
		default:
			return false;
	}
};

var $externalize = function(v, t) {
	switch (t.kind) {
	case "Int64":
	case "Uint64":
		return $flatten64(v);
	case "Array":
		if ($needsExternalization(t.elem)) {
			return $mapArray(v, function(e) { return $externalize(e, t.elem); });
		}
		return v;
	case "Func":
		if (v === $throwNilPointerError) {
			return null;
		}
		var convert = false;
		var i;
		for (i = 0; i < t.params.length; i++) {
			convert = convert || (t.params[i] !== $packages["github.com/gopherjs/gopherjs/js"].Object);
		}
		for (i = 0; i < t.results.length; i++) {
			convert = convert || $needsExternalization(t.results[i]);
		}
		if (!convert) {
			return v;
		}
		return function() {
			var args = [], i;
			for (i = 0; i < t.params.length; i++) {
				if (t.variadic && i === t.params.length - 1) {
					var vt = t.params[i].elem, varargs = [], j;
					for (j = i; j < arguments.length; j++) {
						varargs.push($internalize(arguments[j], vt));
					}
					args.push(new (t.params[i])(varargs));
					break;
				}
				args.push($internalize(arguments[i], t.params[i]));
			}
			var result = v.apply(undefined, args);
			switch (t.results.length) {
			case 0:
				return;
			case 1:
				return $externalize(result, t.results[0]);
			default:
				for (i = 0; i < t.results.length; i++) {
					result[i] = $externalize(result[i], t.results[i]);
				}
				return result;
			}
		};
	case "Interface":
		if (v === null) {
			return null;
		}
		if (t === $packages["github.com/gopherjs/gopherjs/js"].Object || v.constructor.kind === undefined) {
			return v;
		}
		return $externalize(v.$val, v.constructor);
	case "Map":
		var m = {};
		var keys = $keys(v), i;
		for (i = 0; i < keys.length; i++) {
			var entry = v[keys[i]];
			m[$externalize(entry.k, t.key)] = $externalize(entry.v, t.elem);
		}
		return m;
	case "Slice":
		if ($needsExternalization(t.elem)) {
			return $mapArray($sliceToArray(v), function(e) { return $externalize(e, t.elem); });
		}
		return $sliceToArray(v);
	case "String":
		var s = "", r, i, j = 0;
		for (i = 0; i < v.length; i += r[1], j++) {
			r = $decodeRune(v, i);
			s += String.fromCharCode(r[0]);
		}
		return s;
	case "Struct":
		var timePkg = $packages["time"];
		if (timePkg && v.constructor === timePkg.Time.Ptr) {
			var milli = $div64(v.UnixNano(), new $Int64(0, 1000000));
			return new Date($flatten64(milli));
		}
		return v;
	default:
		return v;
	}
};

var $internalize = function(v, t, recv) {
	switch (t.kind) {
	case "Bool":
		return !!v;
	case "Int":
		return parseInt(v);
	case "Int8":
		return parseInt(v) << 24 >> 24;
	case "Int16":
		return parseInt(v) << 16 >> 16;
	case "Int32":
		return parseInt(v) >> 0;
	case "Uint":
		return parseInt(v);
	case "Uint8" :
		return parseInt(v) << 24 >>> 24;
	case "Uint16":
		return parseInt(v) << 16 >>> 16;
	case "Uint32":
	case "Uintptr":
		return parseInt(v) >>> 0;
	case "Int64":
	case "Uint64":
		return new t(0, v);
	case "Float32":
	case "Float64":
		return parseFloat(v);
	case "Array":
		if (v.length !== t.len) {
			$throwRuntimeError("got array with wrong size from JavaScript native");
		}
		return $mapArray(v, function(e) { return $internalize(e, t.elem); });
	case "Func":
		return function() {
			var args = [], i;
			for (i = 0; i < t.params.length; i++) {
				if (t.variadic && i === t.params.length - 1) {
					var vt = t.params[i].elem, varargs = arguments[i], j;
					for (j = 0; j < varargs.length; j++) {
						args.push($externalize(varargs.array[varargs.offset + j], vt));
					}
					break;
				}
				args.push($externalize(arguments[i], t.params[i]));
			}
			var result = v.apply(recv, args);
			switch (t.results.length) {
			case 0:
				return;
			case 1:
				return $internalize(result, t.results[0]);
			default:
				for (i = 0; i < t.results.length; i++) {
					result[i] = $internalize(result[i], t.results[i]);
				}
				return result;
			}
		};
	case "Interface":
		if (v === null || t === $packages["github.com/gopherjs/gopherjs/js"].Object) {
			return v;
		}
		switch (v.constructor) {
		case Int8Array:
			return new ($sliceType($Int8))(v);
		case Int16Array:
			return new ($sliceType($Int16))(v);
		case Int32Array:
			return new ($sliceType($Int))(v);
		case Uint8Array:
			return new ($sliceType($Uint8))(v);
		case Uint16Array:
			return new ($sliceType($Uint16))(v);
		case Uint32Array:
			return new ($sliceType($Uint))(v);
		case Float32Array:
			return new ($sliceType($Float32))(v);
		case Float64Array:
			return new ($sliceType($Float64))(v);
		case Array:
			return $internalize(v, $sliceType($emptyInterface));
		case Boolean:
			return new $Bool(!!v);
		case Date:
			var timePkg = $packages["time"];
			if (timePkg) {
				return new timePkg.Time(timePkg.Unix(new $Int64(0, 0), new $Int64(0, v.getTime() * 1000000)));
			}
		case Function:
			var funcType = $funcType([$sliceType($emptyInterface)], [$packages["github.com/gopherjs/gopherjs/js"].Object], true);
			return new funcType($internalize(v, funcType));
		case Number:
			return new $Float64(parseFloat(v));
		case Object:
			var mapType = $mapType($String, $emptyInterface);
			return new mapType($internalize(v, mapType));
		case String:
			return new $String($internalize(v, $String));
		}
		return v;
	case "Map":
		var m = new $Map();
		var keys = $keys(v), i;
		for (i = 0; i < keys.length; i++) {
			var key = $internalize(keys[i], t.key);
			m[key.$key ? key.$key() : key] = { k: key, v: $internalize(v[keys[i]], t.elem) };
		}
		return m;
	case "Slice":
		return new t($mapArray(v, function(e) { return $internalize(e, t.elem); }));
	case "String":
		v = String(v);
		var s = "", i;
		for (i = 0; i < v.length; i++) {
			s += $encodeRune(v.charCodeAt(i));
		}
		return s;
	default:
		return v;
	}
};

var $copySlice = function(dst, src) {
	var n = Math.min(src.length, dst.length), i;
	if (dst.array.constructor !== Array && n !== 0) {
		dst.array.set(src.array.subarray(src.offset, src.offset + n), dst.offset);
		return n;
	}
	for (i = 0; i < n; i++) {
		dst.array[dst.offset + i] = src.array[src.offset + i];
	}
	return n;
};

var $copyString = function(dst, src) {
	var n = Math.min(src.length, dst.length), i;
	for (i = 0; i < n; i++) {
		dst.array[dst.offset + i] = src.charCodeAt(i);
	}
	return n;
};

var $copyArray = function(dst, src) {
	var i;
	for (i = 0; i < src.length; i++) {
		dst[i] = src[i];
	}
};

var $growSlice = function(slice, length) {
	var newCapacity = Math.max(length, slice.capacity < 1024 ? slice.capacity * 2 : Math.floor(slice.capacity * 5 / 4));

	var newArray;
	if (slice.array.constructor === Array) {
		newArray = slice.array;
		if (slice.offset !== 0 || newArray.length !== slice.offset + slice.capacity) {
			newArray = newArray.slice(slice.offset);
		}
		newArray.length = newCapacity;
	} else {
		newArray = new slice.array.constructor(newCapacity);
		newArray.set(slice.array.subarray(slice.offset));
	}

	var newSlice = new slice.constructor(newArray);
	newSlice.length = slice.length;
	newSlice.capacity = newCapacity;
	return newSlice;
};

var $append = function(slice) {
	if (arguments.length === 1) {
		return slice;
	}

	var newLength = slice.length + arguments.length - 1;
	if (newLength > slice.capacity) {
		slice = $growSlice(slice, newLength);
	}

	var array = slice.array;
	var leftOffset = slice.offset + slice.length - 1, i;
	for (i = 1; i < arguments.length; i++) {
		array[leftOffset + i] = arguments[i];
	}

	var newSlice = new slice.constructor(array);
	newSlice.offset = slice.offset;
	newSlice.length = newLength;
	newSlice.capacity = slice.capacity;
	return newSlice;
};

var $appendSlice = function(slice, toAppend) {
	if (toAppend.length === 0) {
		return slice;
	}

	var newLength = slice.length + toAppend.length;
	if (newLength > slice.capacity) {
		slice = $growSlice(slice, newLength);
	}

	var array = slice.array;
	var leftOffset = slice.offset + slice.length, rightOffset = toAppend.offset, i;
	for (i = 0; i < toAppend.length; i++) {
		array[leftOffset + i] = toAppend.array[rightOffset + i];
	}

	var newSlice = new slice.constructor(array);
	newSlice.offset = slice.offset;
	newSlice.length = newLength;
	newSlice.capacity = slice.capacity;
	return newSlice;
};

var $panic = function(value) {
	var message;
	if (value.constructor === $String) {
		message = value.$val;
	} else if (value.Error !== undefined) {
		message = value.Error();
	} else if (value.String !== undefined) {
		message = value.String();
	} else {
		message = value;
	}
	var err = new Error(message);
	err.$panicValue = value;
	return err;
};
var $notSupported = function(feature) {
	var err = new Error("not supported by GopherJS: " + feature);
	err.$notSupported = feature;
	throw err;
};
var $throwRuntimeError; /* set by package "runtime" */

var $errorStack = [], $jsErr = null;

var $pushErr = function(err) {
	if (err.$panicValue === undefined) {
		if (err.$exit || err.$notSupported) {
			$jsErr = err;
			return;
		}
		err.$panicValue = new $packages["github.com/gopherjs/gopherjs/js"].Error.Ptr(err);
	}
	$errorStack.push({ frame: $getStackDepth(), error: err });
};

var $callDeferred = function(deferred) {
	if ($jsErr !== null) {
		throw $jsErr;
	}
	var i;
	for (i = deferred.length - 1; i >= 0; i--) {
		var call = deferred[i];
		try {
			if (call.recv !== undefined) {
				call.recv[call.method].apply(call.recv, call.args);
				continue;
			}
			call.fun.apply(undefined, call.args);
		} catch (err) {
			$errorStack.push({ frame: $getStackDepth(), error: err });
		}
	}
	var err = $errorStack[$errorStack.length - 1];
	if (err !== undefined && err.frame === $getStackDepth()) {
		$errorStack.pop();
		throw err.error;
	}
};

var $recover = function() {
	var err = $errorStack[$errorStack.length - 1];
	if (err === undefined || err.frame !== $getStackDepth()) {
		return null;
	}
	$errorStack.pop();
	return err.error.$panicValue;
};

var $getStack = function() {
	return (new Error()).stack.split("\n");
};

var $getStackDepth = function() {
	var s = $getStack(), d = 0, i;
	for (i = 0; i < s.length; i++) {
		if (s[i].indexOf("$") === -1) {
			d++;
		}
	}
	return d;
};

var $interfaceIsEqual = function(a, b) {
	if (a === b) {
		return true;
	}
	if (a === null || b === null || a === undefined || b === undefined || a.constructor !== b.constructor) {
		return false;
	}
	switch (a.constructor.kind) {
	case "Float32":
		return $float32IsEqual(a.$val, b.$val);
	case "Complex64":
		return $float32IsEqual(a.$val.real, b.$val.real) && $float32IsEqual(a.$val.imag, b.$val.imag);
	case "Complex128":
		return a.$val.real === b.$val.real && a.$val.imag === b.$val.imag;
	case "Int64":
	case "Uint64":
		return a.$val.high === b.$val.high && a.$val.low === b.$val.low;
	case "Array":
		return $arrayIsEqual(a.$val, b.$val);
	case "Ptr":
		if (a.constructor.Struct) {
			return false;
		}
		return $pointerIsEqual(a, b);
	case "Func":
	case "Map":
	case "Slice":
	case "Struct":
		$throwRuntimeError("comparing uncomparable type " + a.constructor);
	case undefined: /* js.Object */
		return false;
	default:
		return a.$val === b.$val;
	}
};
var $float32IsEqual = function(a, b) {
	if (a === b) {
		return true;
	}
	if (a === 0 || b === 0 || a === 1/0 || b === 1/0 || a === -1/0 || b === -1/0 || a !== a || b !== b) {
		return false;
	}
	var math = $packages["math"];
	return math !== undefined && math.Float32bits(a) === math.Float32bits(b);
};
var $arrayIsEqual = function(a, b) {
	if (a.length != b.length) {
		return false;
	}
	var i;
	for (i = 0; i < a.length; i++) {
		if (a[i] !== b[i]) {
			return false;
		}
	}
	return true;
};
var $sliceIsEqual = function(a, ai, b, bi) {
	return a.array === b.array && a.offset + ai === b.offset + bi;
};
var $pointerIsEqual = function(a, b) {
	if (a === b) {
		return true;
	}
	if (a.$get === $throwNilPointerError || b.$get === $throwNilPointerError) {
		return a.$get === $throwNilPointerError && b.$get === $throwNilPointerError;
	}
	var old = a.$get();
	var dummy = new Object();
	a.$set(dummy);
	var equal = b.$get() === dummy;
	a.$set(old);
	return equal;
};

var $typeAssertionFailed = function(obj, expected) {
	var got = "";
	if (obj !== null) {
		got = obj.constructor.string;
	}
	throw $panic(new $packages["runtime"].TypeAssertionError.Ptr("", got, expected.string, ""));
};

var $now = function() { var msec = (new Date()).getTime(); return [new $Int64(0, Math.floor(msec / 1000)), (msec % 1000) * 1000000]; };

var $packages = {};
$packages["github.com/gopherjs/gopherjs/js"] = (function() {
	var $pkg = {}, Object, Error;
	Object = $pkg.Object = $newType(8, "Interface", "js.Object", "Object", "github.com/gopherjs/gopherjs/js", null);
	Error = $pkg.Error = $newType(0, "Struct", "js.Error", "Error", "github.com/gopherjs/gopherjs/js", function(Object_) {
		this.$val = this;
		this.Object = Object_ !== undefined ? Object_ : null;
	});
	Error.Ptr.prototype.Error = function() {
		var err;
		err = this;
		return "JavaScript error: " + $internalize(err.Object.message, $String);
	};
	Error.prototype.Error = function() { return this.$val.Error(); };
	$pkg.init = function() {
		Object.init([["Bool", "Bool", "", [], [$Bool], false], ["Call", "Call", "", [$String, ($sliceType($emptyInterface))], [Object], true], ["Delete", "Delete", "", [$String], [], false], ["Float", "Float", "", [], [$Float64], false], ["Get", "Get", "", [$String], [Object], false], ["Index", "Index", "", [$Int], [Object], false], ["Int", "Int", "", [], [$Int], false], ["Int64", "Int64", "", [], [$Int64], false], ["Interface", "Interface", "", [], [$emptyInterface], false], ["Invoke", "Invoke", "", [($sliceType($emptyInterface))], [Object], true], ["IsNull", "IsNull", "", [], [$Bool], false], ["IsUndefined", "IsUndefined", "", [], [$Bool], false], ["Length", "Length", "", [], [$Int], false], ["New", "New", "", [($sliceType($emptyInterface))], [Object], true], ["Set", "Set", "", [$String, $emptyInterface], [], false], ["SetIndex", "SetIndex", "", [$Int, $emptyInterface], [], false], ["Str", "Str", "", [], [$String], false], ["Uint64", "Uint64", "", [], [$Uint64], false], ["Unsafe", "Unsafe", "", [], [$Uintptr], false]]);
		Error.methods = [["Bool", "Bool", "", [], [$Bool], false, 0], ["Call", "Call", "", [$String, ($sliceType($emptyInterface))], [Object], true, 0], ["Delete", "Delete", "", [$String], [], false, 0], ["Float", "Float", "", [], [$Float64], false, 0], ["Get", "Get", "", [$String], [Object], false, 0], ["Index", "Index", "", [$Int], [Object], false, 0], ["Int", "Int", "", [], [$Int], false, 0], ["Int64", "Int64", "", [], [$Int64], false, 0], ["Interface", "Interface", "", [], [$emptyInterface], false, 0], ["Invoke", "Invoke", "", [($sliceType($emptyInterface))], [Object], true, 0], ["IsNull", "IsNull", "", [], [$Bool], false, 0], ["IsUndefined", "IsUndefined", "", [], [$Bool], false, 0], ["Length", "Length", "", [], [$Int], false, 0], ["New", "New", "", [($sliceType($emptyInterface))], [Object], true, 0], ["Set", "Set", "", [$String, $emptyInterface], [], false, 0], ["SetIndex", "SetIndex", "", [$Int, $emptyInterface], [], false, 0], ["Str", "Str", "", [], [$String], false, 0], ["Uint64", "Uint64", "", [], [$Uint64], false, 0], ["Unsafe", "Unsafe", "", [], [$Uintptr], false, 0]];
		($ptrType(Error)).methods = [["Bool", "Bool", "", [], [$Bool], false, 0], ["Call", "Call", "", [$String, ($sliceType($emptyInterface))], [Object], true, 0], ["Delete", "Delete", "", [$String], [], false, 0], ["Error", "Error", "", [], [$String], false, -1], ["Float", "Float", "", [], [$Float64], false, 0], ["Get", "Get", "", [$String], [Object], false, 0], ["Index", "Index", "", [$Int], [Object], false, 0], ["Int", "Int", "", [], [$Int], false, 0], ["Int64", "Int64", "", [], [$Int64], false, 0], ["Interface", "Interface", "", [], [$emptyInterface], false, 0], ["Invoke", "Invoke", "", [($sliceType($emptyInterface))], [Object], true, 0], ["IsNull", "IsNull", "", [], [$Bool], false, 0], ["IsUndefined", "IsUndefined", "", [], [$Bool], false, 0], ["Length", "Length", "", [], [$Int], false, 0], ["New", "New", "", [($sliceType($emptyInterface))], [Object], true, 0], ["Set", "Set", "", [$String, $emptyInterface], [], false, 0], ["SetIndex", "SetIndex", "", [$Int, $emptyInterface], [], false, 0], ["Str", "Str", "", [], [$String], false, 0], ["Uint64", "Uint64", "", [], [$Uint64], false, 0], ["Unsafe", "Unsafe", "", [], [$Uintptr], false, 0]];
		Error.init([["Object", "", "", Object, ""]]);
		var e;
		e = new Error.Ptr(null);
	};
	return $pkg;
})();
$packages["runtime"] = (function() {
	var $pkg = {}, js = $packages["github.com/gopherjs/gopherjs/js"], Error, TypeAssertionError, errorString, getgoroot, SetFinalizer, GOROOT, goexit, sizeof_C_MStats;
	Error = $pkg.Error = $newType(8, "Interface", "runtime.Error", "Error", "runtime", null);
	TypeAssertionError = $pkg.TypeAssertionError = $newType(0, "Struct", "runtime.TypeAssertionError", "TypeAssertionError", "runtime", function(interfaceString_, concreteString_, assertedString_, missingMethod_) {
		this.$val = this;
		this.interfaceString = interfaceString_ !== undefined ? interfaceString_ : "";
		this.concreteString = concreteString_ !== undefined ? concreteString_ : "";
		this.assertedString = assertedString_ !== undefined ? assertedString_ : "";
		this.missingMethod = missingMethod_ !== undefined ? missingMethod_ : "";
	});
	errorString = $pkg.errorString = $newType(8, "String", "runtime.errorString", "errorString", "runtime", null);
	getgoroot = function() {
		var process, goroot;
		process = $global.process;
		if (process === undefined) {
			return "/";
		}
		goroot = process.env.GOROOT;
		if (goroot === undefined) {
			return "";
		}
		return $internalize(goroot, $String);
	};
	SetFinalizer = $pkg.SetFinalizer = function(x, f) {
	};
	TypeAssertionError.Ptr.prototype.RuntimeError = function() {
	};
	TypeAssertionError.prototype.RuntimeError = function() { return this.$val.RuntimeError(); };
	TypeAssertionError.Ptr.prototype.Error = function() {
		var e, inter;
		e = this;
		inter = e.interfaceString;
		if (inter === "") {
			inter = "interface";
		}
		if (e.concreteString === "") {
			return "interface conversion: " + inter + " is nil, not " + e.assertedString;
		}
		if (e.missingMethod === "") {
			return "interface conversion: " + inter + " is " + e.concreteString + ", not " + e.assertedString;
		}
		return "interface conversion: " + e.concreteString + " is not " + e.assertedString + ": missing method " + e.missingMethod;
	};
	TypeAssertionError.prototype.Error = function() { return this.$val.Error(); };
	errorString.prototype.RuntimeError = function() {
		var e;
		e = this.$val;
	};
	$ptrType(errorString).prototype.RuntimeError = function() { return new errorString(this.$get()).RuntimeError(); };
	errorString.prototype.Error = function() {
		var e;
		e = this.$val;
		return "runtime error: " + e;
	};
	$ptrType(errorString).prototype.Error = function() { return new errorString(this.$get()).Error(); };
	GOROOT = $pkg.GOROOT = function() {
		var s;
		s = getgoroot();
		if (!(s === "")) {
			return s;
		}
		return "/mnt/fast/go";
	};
	$pkg.init = function() {
		Error.init([["Error", "Error", "", [], [$String], false], ["RuntimeError", "RuntimeError", "", [], [], false]]);
		($ptrType(TypeAssertionError)).methods = [["Error", "Error", "", [], [$String], false, -1], ["RuntimeError", "RuntimeError", "", [], [], false, -1]];
		TypeAssertionError.init([["interfaceString", "interfaceString", "runtime", $String, ""], ["concreteString", "concreteString", "runtime", $String, ""], ["assertedString", "assertedString", "runtime", $String, ""], ["missingMethod", "missingMethod", "runtime", $String, ""]]);
		errorString.methods = [["Error", "Error", "", [], [$String], false, -1], ["RuntimeError", "RuntimeError", "", [], [], false, -1]];
		($ptrType(errorString)).methods = [["Error", "Error", "", [], [$String], false, -1], ["RuntimeError", "RuntimeError", "", [], [], false, -1]];
		sizeof_C_MStats = 3712;
		goexit = $global.eval($externalize("(function() {\n\tvar err = new Error();\n\terr.$exit = true;\n\tthrow err;\n})", $String));
		var e;
		$throwRuntimeError = $externalize((function(msg) {
			throw $panic(new errorString(msg));
		}), ($funcType([$String], [], false)));
		e = new TypeAssertionError.Ptr("", "", "", "");
		if (!((sizeof_C_MStats === 3712))) {
			console.log(sizeof_C_MStats, 3712);
			throw $panic(new $String("MStats vs MemStatsType size mismatch"));
		}
	};
	return $pkg;
})();
$packages["errors"] = (function() {
	var $pkg = {}, errorString, New;
	errorString = $pkg.errorString = $newType(0, "Struct", "errors.errorString", "errorString", "errors", function(s_) {
		this.$val = this;
		this.s = s_ !== undefined ? s_ : "";
	});
	New = $pkg.New = function(text) {
		return new errorString.Ptr(text);
	};
	errorString.Ptr.prototype.Error = function() {
		var e;
		e = this;
		return e.s;
	};
	errorString.prototype.Error = function() { return this.$val.Error(); };
	$pkg.init = function() {
		($ptrType(errorString)).methods = [["Error", "Error", "", [], [$String], false, -1]];
		errorString.init([["s", "s", "errors", $String, ""]]);
	};
	return $pkg;
})();
$packages["sync/atomic"] = (function() {
	var $pkg = {}, CompareAndSwapInt32, AddInt32, LoadUint32, StoreInt32, StoreUint32;
	CompareAndSwapInt32 = $pkg.CompareAndSwapInt32 = function(addr, old, new$1) {
		if (addr.$get() === old) {
			addr.$set(new$1);
			return true;
		}
		return false;
	};
	AddInt32 = $pkg.AddInt32 = function(addr, delta) {
		var new$1;
		new$1 = addr.$get() + delta >> 0;
		addr.$set(new$1);
		return new$1;
	};
	LoadUint32 = $pkg.LoadUint32 = function(addr) {
		return addr.$get();
	};
	StoreInt32 = $pkg.StoreInt32 = function(addr, val) {
		addr.$set(val);
	};
	StoreUint32 = $pkg.StoreUint32 = function(addr, val) {
		addr.$set(val);
	};
	$pkg.init = function() {
	};
	return $pkg;
})();
$packages["sync"] = (function() {
	var $pkg = {}, atomic = $packages["sync/atomic"], Mutex, Locker, Once, RWMutex, rlocker, runtime_Syncsemcheck, runtime_Semacquire, runtime_Semrelease;
	Mutex = $pkg.Mutex = $newType(0, "Struct", "sync.Mutex", "Mutex", "sync", function(state_, sema_) {
		this.$val = this;
		this.state = state_ !== undefined ? state_ : 0;
		this.sema = sema_ !== undefined ? sema_ : 0;
	});
	Locker = $pkg.Locker = $newType(8, "Interface", "sync.Locker", "Locker", "sync", null);
	Once = $pkg.Once = $newType(0, "Struct", "sync.Once", "Once", "sync", function(m_, done_) {
		this.$val = this;
		this.m = m_ !== undefined ? m_ : new Mutex.Ptr();
		this.done = done_ !== undefined ? done_ : 0;
	});
	RWMutex = $pkg.RWMutex = $newType(0, "Struct", "sync.RWMutex", "RWMutex", "sync", function(w_, writerSem_, readerSem_, readerCount_, readerWait_) {
		this.$val = this;
		this.w = w_ !== undefined ? w_ : new Mutex.Ptr();
		this.writerSem = writerSem_ !== undefined ? writerSem_ : 0;
		this.readerSem = readerSem_ !== undefined ? readerSem_ : 0;
		this.readerCount = readerCount_ !== undefined ? readerCount_ : 0;
		this.readerWait = readerWait_ !== undefined ? readerWait_ : 0;
	});
	rlocker = $pkg.rlocker = $newType(0, "Struct", "sync.rlocker", "rlocker", "sync", function(w_, writerSem_, readerSem_, readerCount_, readerWait_) {
		this.$val = this;
		this.w = w_ !== undefined ? w_ : new Mutex.Ptr();
		this.writerSem = writerSem_ !== undefined ? writerSem_ : 0;
		this.readerSem = readerSem_ !== undefined ? readerSem_ : 0;
		this.readerCount = readerCount_ !== undefined ? readerCount_ : 0;
		this.readerWait = readerWait_ !== undefined ? readerWait_ : 0;
	});
	runtime_Syncsemcheck = function(size) {
	};
	Mutex.Ptr.prototype.Lock = function() {
		var m, v, awoke, old, new$1, v$1, v$2;
		m = this;
		if (atomic.CompareAndSwapInt32(new ($ptrType($Int32))(function() { return m.state; }, function(v) { m.state = v;; }), 0, 1)) {
			return;
		}
		awoke = false;
		while (true) {
			old = m.state;
			new$1 = old | 1;
			if (!(((old & 1) === 0))) {
				new$1 = old + 4 >> 0;
			}
			if (awoke) {
				new$1 = new$1 & ~2;
			}
			if (atomic.CompareAndSwapInt32(new ($ptrType($Int32))(function() { return m.state; }, function(v$1) { m.state = v$1;; }), old, new$1)) {
				if ((old & 1) === 0) {
					break;
				}
				runtime_Semacquire(new ($ptrType($Uint32))(function() { return m.sema; }, function(v$2) { m.sema = v$2;; }));
				awoke = true;
			}
		}
	};
	Mutex.prototype.Lock = function() { return this.$val.Lock(); };
	Mutex.Ptr.prototype.Unlock = function() {
		var m, v, new$1, old, v$1, v$2;
		m = this;
		new$1 = atomic.AddInt32(new ($ptrType($Int32))(function() { return m.state; }, function(v) { m.state = v;; }), -1);
		if ((((new$1 + 1 >> 0)) & 1) === 0) {
			throw $panic(new $String("sync: unlock of unlocked mutex"));
		}
		old = new$1;
		while (true) {
			if (((old >> 2 >> 0) === 0) || !(((old & 3) === 0))) {
				return;
			}
			new$1 = ((old - 4 >> 0)) | 2;
			if (atomic.CompareAndSwapInt32(new ($ptrType($Int32))(function() { return m.state; }, function(v$1) { m.state = v$1;; }), old, new$1)) {
				runtime_Semrelease(new ($ptrType($Uint32))(function() { return m.sema; }, function(v$2) { m.sema = v$2;; }));
				return;
			}
			old = m.state;
		}
	};
	Mutex.prototype.Unlock = function() { return this.$val.Unlock(); };
	Once.Ptr.prototype.Do = function(f) {
		var o, v, v$1;
		var $deferred = [];
		try {
			o = this;
			if (atomic.LoadUint32(new ($ptrType($Uint32))(function() { return o.done; }, function(v) { o.done = v;; })) === 1) {
				return;
			}
			o.m.Lock();
			$deferred.push({ recv: o.m, method: "Unlock", args: [] });
			if (o.done === 0) {
				f();
				atomic.StoreUint32(new ($ptrType($Uint32))(function() { return o.done; }, function(v$1) { o.done = v$1;; }), 1);
			}
		} catch($err) {
			$pushErr($err);
		} finally {
			$callDeferred($deferred);
		}
	};
	Once.prototype.Do = function(f) { return this.$val.Do(f); };
	runtime_Semacquire = function() {
		throw $panic("Native function not implemented: runtime_Semacquire");
	};
	runtime_Semrelease = function() {
		throw $panic("Native function not implemented: runtime_Semrelease");
	};
	RWMutex.Ptr.prototype.RLock = function() {
		var rw, v, v$1;
		rw = this;
		if (atomic.AddInt32(new ($ptrType($Int32))(function() { return rw.readerCount; }, function(v) { rw.readerCount = v;; }), 1) < 0) {
			runtime_Semacquire(new ($ptrType($Uint32))(function() { return rw.readerSem; }, function(v$1) { rw.readerSem = v$1;; }));
		}
	};
	RWMutex.prototype.RLock = function() { return this.$val.RLock(); };
	RWMutex.Ptr.prototype.RUnlock = function() {
		var rw, v, v$1, v$2;
		rw = this;
		if (atomic.AddInt32(new ($ptrType($Int32))(function() { return rw.readerCount; }, function(v) { rw.readerCount = v;; }), -1) < 0) {
			if (atomic.AddInt32(new ($ptrType($Int32))(function() { return rw.readerWait; }, function(v$1) { rw.readerWait = v$1;; }), -1) === 0) {
				runtime_Semrelease(new ($ptrType($Uint32))(function() { return rw.writerSem; }, function(v$2) { rw.writerSem = v$2;; }));
			}
		}
	};
	RWMutex.prototype.RUnlock = function() { return this.$val.RUnlock(); };
	RWMutex.Ptr.prototype.Lock = function() {
		var rw, v, r, v$1, v$2;
		rw = this;
		rw.w.Lock();
		r = atomic.AddInt32(new ($ptrType($Int32))(function() { return rw.readerCount; }, function(v) { rw.readerCount = v;; }), -1073741824) + 1073741824 >> 0;
		if (!((r === 0)) && !((atomic.AddInt32(new ($ptrType($Int32))(function() { return rw.readerWait; }, function(v$1) { rw.readerWait = v$1;; }), r) === 0))) {
			runtime_Semacquire(new ($ptrType($Uint32))(function() { return rw.writerSem; }, function(v$2) { rw.writerSem = v$2;; }));
		}
	};
	RWMutex.prototype.Lock = function() { return this.$val.Lock(); };
	RWMutex.Ptr.prototype.Unlock = function() {
		var rw, v, r, i, v$1;
		rw = this;
		r = atomic.AddInt32(new ($ptrType($Int32))(function() { return rw.readerCount; }, function(v) { rw.readerCount = v;; }), 1073741824);
		i = 0;
		while (i < (r >> 0)) {
			runtime_Semrelease(new ($ptrType($Uint32))(function() { return rw.readerSem; }, function(v$1) { rw.readerSem = v$1;; }));
			i = i + 1 >> 0;
		}
		rw.w.Unlock();
	};
	RWMutex.prototype.Unlock = function() { return this.$val.Unlock(); };
	RWMutex.Ptr.prototype.RLocker = function() {
		var rw, _struct, _struct$1;
		rw = this;
		return (_struct = rw, new rlocker.Ptr((_struct$1 = _struct.w, new Mutex.Ptr(_struct$1.state, _struct$1.sema)), _struct.writerSem, _struct.readerSem, _struct.readerCount, _struct.readerWait));
	};
	RWMutex.prototype.RLocker = function() { return this.$val.RLocker(); };
	rlocker.Ptr.prototype.Lock = function() {
		var r, _struct, _struct$1;
		r = this;
		(_struct = r, new RWMutex.Ptr((_struct$1 = _struct.w, new Mutex.Ptr(_struct$1.state, _struct$1.sema)), _struct.writerSem, _struct.readerSem, _struct.readerCount, _struct.readerWait)).RLock();
	};
	rlocker.prototype.Lock = function() { return this.$val.Lock(); };
	rlocker.Ptr.prototype.Unlock = function() {
		var r, _struct, _struct$1;
		r = this;
		(_struct = r, new RWMutex.Ptr((_struct$1 = _struct.w, new Mutex.Ptr(_struct$1.state, _struct$1.sema)), _struct.writerSem, _struct.readerSem, _struct.readerCount, _struct.readerWait)).RUnlock();
	};
	rlocker.prototype.Unlock = function() { return this.$val.Unlock(); };
	$pkg.init = function() {
		($ptrType(Mutex)).methods = [["Lock", "Lock", "", [], [], false, -1], ["Unlock", "Unlock", "", [], [], false, -1]];
		Mutex.init([["state", "state", "sync", $Int32, ""], ["sema", "sema", "sync", $Uint32, ""]]);
		Locker.init([["Lock", "Lock", "", [], [], false], ["Unlock", "Unlock", "", [], [], false]]);
		($ptrType(Once)).methods = [["Do", "Do", "", [($funcType([], [], false))], [], false, -1]];
		Once.init([["m", "m", "sync", Mutex, ""], ["done", "done", "sync", $Uint32, ""]]);
		($ptrType(RWMutex)).methods = [["Lock", "Lock", "", [], [], false, -1], ["RLock", "RLock", "", [], [], false, -1], ["RLocker", "RLocker", "", [], [Locker], false, -1], ["RUnlock", "RUnlock", "", [], [], false, -1], ["Unlock", "Unlock", "", [], [], false, -1]];
		RWMutex.init([["w", "w", "sync", Mutex, ""], ["writerSem", "writerSem", "sync", $Uint32, ""], ["readerSem", "readerSem", "sync", $Uint32, ""], ["readerCount", "readerCount", "sync", $Int32, ""], ["readerWait", "readerWait", "sync", $Int32, ""]]);
		($ptrType(rlocker)).methods = [["Lock", "Lock", "", [], [], false, -1], ["Unlock", "Unlock", "", [], [], false, -1]];
		rlocker.init([["w", "w", "sync", Mutex, ""], ["writerSem", "writerSem", "sync", $Uint32, ""], ["readerSem", "readerSem", "sync", $Uint32, ""], ["readerCount", "readerCount", "sync", $Int32, ""], ["readerWait", "readerWait", "sync", $Int32, ""]]);
		var s;
		s = $makeNativeArray("Uintptr", 3, function() { return 0; });
		runtime_Syncsemcheck(12);
	};
	return $pkg;
})();
$packages["io"] = (function() {
	var $pkg = {}, errors = $packages["errors"], sync = $packages["sync"], Reader, Writer, RuneReader, errWhence, errOffset;
	Reader = $pkg.Reader = $newType(8, "Interface", "io.Reader", "Reader", "io", null);
	Writer = $pkg.Writer = $newType(8, "Interface", "io.Writer", "Writer", "io", null);
	RuneReader = $pkg.RuneReader = $newType(8, "Interface", "io.RuneReader", "RuneReader", "io", null);
	$pkg.init = function() {
		Reader.init([["Read", "Read", "", [($sliceType($Uint8))], [$Int, $error], false]]);
		Writer.init([["Write", "Write", "", [($sliceType($Uint8))], [$Int, $error], false]]);
		RuneReader.init([["ReadRune", "ReadRune", "", [], [$Int32, $Int, $error], false]]);
		$pkg.ErrShortWrite = errors.New("short write");
		$pkg.ErrShortBuffer = errors.New("short buffer");
		$pkg.EOF = errors.New("EOF");
		$pkg.ErrUnexpectedEOF = errors.New("unexpected EOF");
		$pkg.ErrNoProgress = errors.New("multiple Read calls return no data or error");
		errWhence = errors.New("Seek: invalid whence");
		errOffset = errors.New("Seek: invalid offset");
		$pkg.ErrClosedPipe = errors.New("io: read/write on closed pipe");
	};
	return $pkg;
})();
$packages["unicode"] = (function() {
	var $pkg = {}, RangeTable, Range16, Range32, CaseRange, d, foldPair, IsDigit, IsLetter, is16, is32, isExcludingLatin, to, To, ToUpper, ToLower, SimpleFold, _L, _Nd, _CaseRanges, properties, caseOrbit;
	RangeTable = $pkg.RangeTable = $newType(0, "Struct", "unicode.RangeTable", "RangeTable", "unicode", function(R16_, R32_, LatinOffset_) {
		this.$val = this;
		this.R16 = R16_ !== undefined ? R16_ : ($sliceType(Range16)).nil;
		this.R32 = R32_ !== undefined ? R32_ : ($sliceType(Range32)).nil;
		this.LatinOffset = LatinOffset_ !== undefined ? LatinOffset_ : 0;
	});
	Range16 = $pkg.Range16 = $newType(0, "Struct", "unicode.Range16", "Range16", "unicode", function(Lo_, Hi_, Stride_) {
		this.$val = this;
		this.Lo = Lo_ !== undefined ? Lo_ : 0;
		this.Hi = Hi_ !== undefined ? Hi_ : 0;
		this.Stride = Stride_ !== undefined ? Stride_ : 0;
	});
	Range32 = $pkg.Range32 = $newType(0, "Struct", "unicode.Range32", "Range32", "unicode", function(Lo_, Hi_, Stride_) {
		this.$val = this;
		this.Lo = Lo_ !== undefined ? Lo_ : 0;
		this.Hi = Hi_ !== undefined ? Hi_ : 0;
		this.Stride = Stride_ !== undefined ? Stride_ : 0;
	});
	CaseRange = $pkg.CaseRange = $newType(0, "Struct", "unicode.CaseRange", "CaseRange", "unicode", function(Lo_, Hi_, Delta_) {
		this.$val = this;
		this.Lo = Lo_ !== undefined ? Lo_ : 0;
		this.Hi = Hi_ !== undefined ? Hi_ : 0;
		this.Delta = Delta_ !== undefined ? Delta_ : $makeNativeArray("Int32", 3, function() { return 0; });
	});
	d = $pkg.d = $newType(12, "Array", "unicode.d", "d", "unicode", null);
	foldPair = $pkg.foldPair = $newType(0, "Struct", "unicode.foldPair", "foldPair", "unicode", function(From_, To_) {
		this.$val = this;
		this.From = From_ !== undefined ? From_ : 0;
		this.To = To_ !== undefined ? To_ : 0;
	});
	IsDigit = $pkg.IsDigit = function(r) {
		if (r <= 255) {
			return 48 <= r && r <= 57;
		}
		return isExcludingLatin($pkg.Digit, r);
	};
	IsLetter = $pkg.IsLetter = function(r) {
		if ((r >>> 0) <= 255) {
			return !((((properties[(r << 24 >>> 24)] & 96) >>> 0) === 0));
		}
		return isExcludingLatin($pkg.Letter, r);
	};
	is16 = function(ranges, r) {
		var _ref, _i, i, range_, _r, lo, hi, _q, m, range_$1, _r$1;
		if (ranges.length <= 18 || r <= 255) {
			_ref = ranges;
			_i = 0;
			while (_i < _ref.length) {
				i = _i;
				range_ = ((i < 0 || i >= ranges.length) ? $throwRuntimeError("index out of range") : ranges.array[ranges.offset + i]);
				if (r < range_.Lo) {
					return false;
				}
				if (r <= range_.Hi) {
					return (_r = ((r - range_.Lo << 16 >>> 16)) % range_.Stride, _r === _r ? _r : $throwRuntimeError("integer divide by zero")) === 0;
				}
				_i++;
			}
			return false;
		}
		lo = 0;
		hi = ranges.length;
		while (lo < hi) {
			m = lo + (_q = ((hi - lo >> 0)) / 2, (_q === _q && _q !== 1/0 && _q !== -1/0) ? _q >> 0 : $throwRuntimeError("integer divide by zero")) >> 0;
			range_$1 = ((m < 0 || m >= ranges.length) ? $throwRuntimeError("index out of range") : ranges.array[ranges.offset + m]);
			if (range_$1.Lo <= r && r <= range_$1.Hi) {
				return (_r$1 = ((r - range_$1.Lo << 16 >>> 16)) % range_$1.Stride, _r$1 === _r$1 ? _r$1 : $throwRuntimeError("integer divide by zero")) === 0;
			}
			if (r < range_$1.Lo) {
				hi = m;
			} else {
				lo = m + 1 >> 0;
			}
		}
		return false;
	};
	is32 = function(ranges, r) {
		var _ref, _i, i, range_, _r, lo, hi, _q, m, _struct, range_$1, _r$1;
		if (ranges.length <= 18) {
			_ref = ranges;
			_i = 0;
			while (_i < _ref.length) {
				i = _i;
				range_ = ((i < 0 || i >= ranges.length) ? $throwRuntimeError("index out of range") : ranges.array[ranges.offset + i]);
				if (r < range_.Lo) {
					return false;
				}
				if (r <= range_.Hi) {
					return (_r = ((r - range_.Lo >>> 0)) % range_.Stride, _r === _r ? _r : $throwRuntimeError("integer divide by zero")) === 0;
				}
				_i++;
			}
			return false;
		}
		lo = 0;
		hi = ranges.length;
		while (lo < hi) {
			m = lo + (_q = ((hi - lo >> 0)) / 2, (_q === _q && _q !== 1/0 && _q !== -1/0) ? _q >> 0 : $throwRuntimeError("integer divide by zero")) >> 0;
			range_$1 = (_struct = ((m < 0 || m >= ranges.length) ? $throwRuntimeError("index out of range") : ranges.array[ranges.offset + m]), new Range32.Ptr(_struct.Lo, _struct.Hi, _struct.Stride));
			if (range_$1.Lo <= r && r <= range_$1.Hi) {
				return (_r$1 = ((r - range_$1.Lo >>> 0)) % range_$1.Stride, _r$1 === _r$1 ? _r$1 : $throwRuntimeError("integer divide by zero")) === 0;
			}
			if (r < range_$1.Lo) {
				hi = m;
			} else {
				lo = m + 1 >> 0;
			}
		}
		return false;
	};
	isExcludingLatin = function(rangeTab, r) {
		var r16, off, x, r32;
		r16 = rangeTab.R16;
		off = rangeTab.LatinOffset;
		if (r16.length > off && r <= ((x = r16.length - 1 >> 0, ((x < 0 || x >= r16.length) ? $throwRuntimeError("index out of range") : r16.array[r16.offset + x])).Hi >> 0)) {
			return is16($subslice(r16, off), (r << 16 >>> 16));
		}
		r32 = rangeTab.R32;
		if (r32.length > 0 && r >= (((0 < 0 || 0 >= r32.length) ? $throwRuntimeError("index out of range") : r32.array[r32.offset + 0]).Lo >> 0)) {
			return is32(r32, (r >>> 0));
		}
		return false;
	};
	to = function(_case, r, caseRange) {
		var lo, hi, _q, m, _struct, cr, delta;
		if (_case < 0 || 3 <= _case) {
			return 65533;
		}
		lo = 0;
		hi = caseRange.length;
		while (lo < hi) {
			m = lo + (_q = ((hi - lo >> 0)) / 2, (_q === _q && _q !== 1/0 && _q !== -1/0) ? _q >> 0 : $throwRuntimeError("integer divide by zero")) >> 0;
			cr = (_struct = ((m < 0 || m >= caseRange.length) ? $throwRuntimeError("index out of range") : caseRange.array[caseRange.offset + m]), new CaseRange.Ptr(_struct.Lo, _struct.Hi, $mapArray(_struct.Delta, function(entry) { return entry; })));
			if ((cr.Lo >> 0) <= r && r <= (cr.Hi >> 0)) {
				delta = cr.Delta[_case];
				if (delta > 1114111) {
					return (cr.Lo >> 0) + (((((r - (cr.Lo >> 0) >> 0)) & ~1) | ((_case & 1) >> 0))) >> 0;
				}
				return r + delta >> 0;
			}
			if (r < (cr.Lo >> 0)) {
				hi = m;
			} else {
				lo = m + 1 >> 0;
			}
		}
		return r;
	};
	To = $pkg.To = function(_case, r) {
		return to(_case, r, $pkg.CaseRanges);
	};
	ToUpper = $pkg.ToUpper = function(r) {
		if (r <= 127) {
			if (97 <= r && r <= 122) {
				r = r - 32 >> 0;
			}
			return r;
		}
		return To(0, r);
	};
	ToLower = $pkg.ToLower = function(r) {
		if (r <= 127) {
			if (65 <= r && r <= 90) {
				r = r + 32 >> 0;
			}
			return r;
		}
		return To(1, r);
	};
	SimpleFold = $pkg.SimpleFold = function(r) {
		var lo, hi, _q, m, l;
		lo = 0;
		hi = caseOrbit.length;
		while (lo < hi) {
			m = lo + (_q = ((hi - lo >> 0)) / 2, (_q === _q && _q !== 1/0 && _q !== -1/0) ? _q >> 0 : $throwRuntimeError("integer divide by zero")) >> 0;
			if ((((m < 0 || m >= caseOrbit.length) ? $throwRuntimeError("index out of range") : caseOrbit.array[caseOrbit.offset + m]).From >> 0) < r) {
				lo = m + 1 >> 0;
			} else {
				hi = m;
			}
		}
		if (lo < caseOrbit.length && ((((lo < 0 || lo >= caseOrbit.length) ? $throwRuntimeError("index out of range") : caseOrbit.array[caseOrbit.offset + lo]).From >> 0) === r)) {
			return (((lo < 0 || lo >= caseOrbit.length) ? $throwRuntimeError("index out of range") : caseOrbit.array[caseOrbit.offset + lo]).To >> 0);
		}
		l = ToLower(r);
		if (!((l === r))) {
			return l;
		}
		return ToUpper(r);
	};
	$pkg.init = function() {
		RangeTable.init([["R16", "R16", "", ($sliceType(Range16)), ""], ["R32", "R32", "", ($sliceType(Range32)), ""], ["LatinOffset", "LatinOffset", "", $Int, ""]]);
		Range16.init([["Lo", "Lo", "", $Uint16, ""], ["Hi", "Hi", "", $Uint16, ""], ["Stride", "Stride", "", $Uint16, ""]]);
		Range32.init([["Lo", "Lo", "", $Uint32, ""], ["Hi", "Hi", "", $Uint32, ""], ["Stride", "Stride", "", $Uint32, ""]]);
		CaseRange.init([["Lo", "Lo", "", $Uint32, ""], ["Hi", "Hi", "", $Uint32, ""], ["Delta", "Delta", "", d, ""]]);
		d.init($Int32, 3);
		foldPair.init([["From", "From", "", $Uint16, ""], ["To", "To", "", $Uint16, ""]]);
		_L = new RangeTable.Ptr(new ($sliceType(Range16))([new Range16.Ptr(65, 90, 1), new Range16.Ptr(97, 122, 1), new Range16.Ptr(170, 181, 11), new Range16.Ptr(186, 192, 6), new Range16.Ptr(193, 214, 1), new Range16.Ptr(216, 246, 1), new Range16.Ptr(248, 705, 1), new Range16.Ptr(710, 721, 1), new Range16.Ptr(736, 740, 1), new Range16.Ptr(748, 750, 2), new Range16.Ptr(880, 884, 1), new Range16.Ptr(886, 887, 1), new Range16.Ptr(890, 893, 1), new Range16.Ptr(902, 904, 2), new Range16.Ptr(905, 906, 1), new Range16.Ptr(908, 910, 2), new Range16.Ptr(911, 929, 1), new Range16.Ptr(931, 1013, 1), new Range16.Ptr(1015, 1153, 1), new Range16.Ptr(1162, 1319, 1), new Range16.Ptr(1329, 1366, 1), new Range16.Ptr(1369, 1377, 8), new Range16.Ptr(1378, 1415, 1), new Range16.Ptr(1488, 1514, 1), new Range16.Ptr(1520, 1522, 1), new Range16.Ptr(1568, 1610, 1), new Range16.Ptr(1646, 1647, 1), new Range16.Ptr(1649, 1747, 1), new Range16.Ptr(1749, 1765, 16), new Range16.Ptr(1766, 1774, 8), new Range16.Ptr(1775, 1786, 11), new Range16.Ptr(1787, 1788, 1), new Range16.Ptr(1791, 1808, 17), new Range16.Ptr(1810, 1839, 1), new Range16.Ptr(1869, 1957, 1), new Range16.Ptr(1969, 1994, 25), new Range16.Ptr(1995, 2026, 1), new Range16.Ptr(2036, 2037, 1), new Range16.Ptr(2042, 2048, 6), new Range16.Ptr(2049, 2069, 1), new Range16.Ptr(2074, 2084, 10), new Range16.Ptr(2088, 2112, 24), new Range16.Ptr(2113, 2136, 1), new Range16.Ptr(2208, 2210, 2), new Range16.Ptr(2211, 2220, 1), new Range16.Ptr(2308, 2361, 1), new Range16.Ptr(2365, 2384, 19), new Range16.Ptr(2392, 2401, 1), new Range16.Ptr(2417, 2423, 1), new Range16.Ptr(2425, 2431, 1), new Range16.Ptr(2437, 2444, 1), new Range16.Ptr(2447, 2448, 1), new Range16.Ptr(2451, 2472, 1), new Range16.Ptr(2474, 2480, 1), new Range16.Ptr(2482, 2486, 4), new Range16.Ptr(2487, 2489, 1), new Range16.Ptr(2493, 2510, 17), new Range16.Ptr(2524, 2525, 1), new Range16.Ptr(2527, 2529, 1), new Range16.Ptr(2544, 2545, 1), new Range16.Ptr(2565, 2570, 1), new Range16.Ptr(2575, 2576, 1), new Range16.Ptr(2579, 2600, 1), new Range16.Ptr(2602, 2608, 1), new Range16.Ptr(2610, 2611, 1), new Range16.Ptr(2613, 2614, 1), new Range16.Ptr(2616, 2617, 1), new Range16.Ptr(2649, 2652, 1), new Range16.Ptr(2654, 2674, 20), new Range16.Ptr(2675, 2676, 1), new Range16.Ptr(2693, 2701, 1), new Range16.Ptr(2703, 2705, 1), new Range16.Ptr(2707, 2728, 1), new Range16.Ptr(2730, 2736, 1), new Range16.Ptr(2738, 2739, 1), new Range16.Ptr(2741, 2745, 1), new Range16.Ptr(2749, 2768, 19), new Range16.Ptr(2784, 2785, 1), new Range16.Ptr(2821, 2828, 1), new Range16.Ptr(2831, 2832, 1), new Range16.Ptr(2835, 2856, 1), new Range16.Ptr(2858, 2864, 1), new Range16.Ptr(2866, 2867, 1), new Range16.Ptr(2869, 2873, 1), new Range16.Ptr(2877, 2908, 31), new Range16.Ptr(2909, 2911, 2), new Range16.Ptr(2912, 2913, 1), new Range16.Ptr(2929, 2947, 18), new Range16.Ptr(2949, 2954, 1), new Range16.Ptr(2958, 2960, 1), new Range16.Ptr(2962, 2965, 1), new Range16.Ptr(2969, 2970, 1), new Range16.Ptr(2972, 2974, 2), new Range16.Ptr(2975, 2979, 4), new Range16.Ptr(2980, 2984, 4), new Range16.Ptr(2985, 2986, 1), new Range16.Ptr(2990, 3001, 1), new Range16.Ptr(3024, 3077, 53), new Range16.Ptr(3078, 3084, 1), new Range16.Ptr(3086, 3088, 1), new Range16.Ptr(3090, 3112, 1), new Range16.Ptr(3114, 3123, 1), new Range16.Ptr(3125, 3129, 1), new Range16.Ptr(3133, 3160, 27), new Range16.Ptr(3161, 3168, 7), new Range16.Ptr(3169, 3205, 36), new Range16.Ptr(3206, 3212, 1), new Range16.Ptr(3214, 3216, 1), new Range16.Ptr(3218, 3240, 1), new Range16.Ptr(3242, 3251, 1), new Range16.Ptr(3253, 3257, 1), new Range16.Ptr(3261, 3294, 33), new Range16.Ptr(3296, 3297, 1), new Range16.Ptr(3313, 3314, 1), new Range16.Ptr(3333, 3340, 1), new Range16.Ptr(3342, 3344, 1), new Range16.Ptr(3346, 3386, 1), new Range16.Ptr(3389, 3406, 17), new Range16.Ptr(3424, 3425, 1), new Range16.Ptr(3450, 3455, 1), new Range16.Ptr(3461, 3478, 1), new Range16.Ptr(3482, 3505, 1), new Range16.Ptr(3507, 3515, 1), new Range16.Ptr(3517, 3520, 3), new Range16.Ptr(3521, 3526, 1), new Range16.Ptr(3585, 3632, 1), new Range16.Ptr(3634, 3635, 1), new Range16.Ptr(3648, 3654, 1), new Range16.Ptr(3713, 3714, 1), new Range16.Ptr(3716, 3719, 3), new Range16.Ptr(3720, 3722, 2), new Range16.Ptr(3725, 3732, 7), new Range16.Ptr(3733, 3735, 1), new Range16.Ptr(3737, 3743, 1), new Range16.Ptr(3745, 3747, 1), new Range16.Ptr(3749, 3751, 2), new Range16.Ptr(3754, 3755, 1), new Range16.Ptr(3757, 3760, 1), new Range16.Ptr(3762, 3763, 1), new Range16.Ptr(3773, 3776, 3), new Range16.Ptr(3777, 3780, 1), new Range16.Ptr(3782, 3804, 22), new Range16.Ptr(3805, 3807, 1), new Range16.Ptr(3840, 3904, 64), new Range16.Ptr(3905, 3911, 1), new Range16.Ptr(3913, 3948, 1), new Range16.Ptr(3976, 3980, 1), new Range16.Ptr(4096, 4138, 1), new Range16.Ptr(4159, 4176, 17), new Range16.Ptr(4177, 4181, 1), new Range16.Ptr(4186, 4189, 1), new Range16.Ptr(4193, 4197, 4), new Range16.Ptr(4198, 4206, 8), new Range16.Ptr(4207, 4208, 1), new Range16.Ptr(4213, 4225, 1), new Range16.Ptr(4238, 4256, 18), new Range16.Ptr(4257, 4293, 1), new Range16.Ptr(4295, 4301, 6), new Range16.Ptr(4304, 4346, 1), new Range16.Ptr(4348, 4680, 1), new Range16.Ptr(4682, 4685, 1), new Range16.Ptr(4688, 4694, 1), new Range16.Ptr(4696, 4698, 2), new Range16.Ptr(4699, 4701, 1), new Range16.Ptr(4704, 4744, 1), new Range16.Ptr(4746, 4749, 1), new Range16.Ptr(4752, 4784, 1), new Range16.Ptr(4786, 4789, 1), new Range16.Ptr(4792, 4798, 1), new Range16.Ptr(4800, 4802, 2), new Range16.Ptr(4803, 4805, 1), new Range16.Ptr(4808, 4822, 1), new Range16.Ptr(4824, 4880, 1), new Range16.Ptr(4882, 4885, 1), new Range16.Ptr(4888, 4954, 1), new Range16.Ptr(4992, 5007, 1), new Range16.Ptr(5024, 5108, 1), new Range16.Ptr(5121, 5740, 1), new Range16.Ptr(5743, 5759, 1), new Range16.Ptr(5761, 5786, 1), new Range16.Ptr(5792, 5866, 1), new Range16.Ptr(5888, 5900, 1), new Range16.Ptr(5902, 5905, 1), new Range16.Ptr(5920, 5937, 1), new Range16.Ptr(5952, 5969, 1), new Range16.Ptr(5984, 5996, 1), new Range16.Ptr(5998, 6000, 1), new Range16.Ptr(6016, 6067, 1), new Range16.Ptr(6103, 6108, 5), new Range16.Ptr(6176, 6263, 1), new Range16.Ptr(6272, 6312, 1), new Range16.Ptr(6314, 6320, 6), new Range16.Ptr(6321, 6389, 1), new Range16.Ptr(6400, 6428, 1), new Range16.Ptr(6480, 6509, 1), new Range16.Ptr(6512, 6516, 1), new Range16.Ptr(6528, 6571, 1), new Range16.Ptr(6593, 6599, 1), new Range16.Ptr(6656, 6678, 1), new Range16.Ptr(6688, 6740, 1), new Range16.Ptr(6823, 6917, 94), new Range16.Ptr(6918, 6963, 1), new Range16.Ptr(6981, 6987, 1), new Range16.Ptr(7043, 7072, 1), new Range16.Ptr(7086, 7087, 1), new Range16.Ptr(7098, 7141, 1), new Range16.Ptr(7168, 7203, 1), new Range16.Ptr(7245, 7247, 1), new Range16.Ptr(7258, 7293, 1), new Range16.Ptr(7401, 7404, 1), new Range16.Ptr(7406, 7409, 1), new Range16.Ptr(7413, 7414, 1), new Range16.Ptr(7424, 7615, 1), new Range16.Ptr(7680, 7957, 1), new Range16.Ptr(7960, 7965, 1), new Range16.Ptr(7968, 8005, 1), new Range16.Ptr(8008, 8013, 1), new Range16.Ptr(8016, 8023, 1), new Range16.Ptr(8025, 8031, 2), new Range16.Ptr(8032, 8061, 1), new Range16.Ptr(8064, 8116, 1), new Range16.Ptr(8118, 8124, 1), new Range16.Ptr(8126, 8130, 4), new Range16.Ptr(8131, 8132, 1), new Range16.Ptr(8134, 8140, 1), new Range16.Ptr(8144, 8147, 1), new Range16.Ptr(8150, 8155, 1), new Range16.Ptr(8160, 8172, 1), new Range16.Ptr(8178, 8180, 1), new Range16.Ptr(8182, 8188, 1), new Range16.Ptr(8305, 8319, 14), new Range16.Ptr(8336, 8348, 1), new Range16.Ptr(8450, 8455, 5), new Range16.Ptr(8458, 8467, 1), new Range16.Ptr(8469, 8473, 4), new Range16.Ptr(8474, 8477, 1), new Range16.Ptr(8484, 8490, 2), new Range16.Ptr(8491, 8493, 1), new Range16.Ptr(8495, 8505, 1), new Range16.Ptr(8508, 8511, 1), new Range16.Ptr(8517, 8521, 1), new Range16.Ptr(8526, 8579, 53), new Range16.Ptr(8580, 11264, 2684), new Range16.Ptr(11265, 11310, 1), new Range16.Ptr(11312, 11358, 1), new Range16.Ptr(11360, 11492, 1), new Range16.Ptr(11499, 11502, 1), new Range16.Ptr(11506, 11507, 1), new Range16.Ptr(11520, 11557, 1), new Range16.Ptr(11559, 11565, 6), new Range16.Ptr(11568, 11623, 1), new Range16.Ptr(11631, 11648, 17), new Range16.Ptr(11649, 11670, 1), new Range16.Ptr(11680, 11686, 1), new Range16.Ptr(11688, 11694, 1), new Range16.Ptr(11696, 11702, 1), new Range16.Ptr(11704, 11710, 1), new Range16.Ptr(11712, 11718, 1), new Range16.Ptr(11720, 11726, 1), new Range16.Ptr(11728, 11734, 1), new Range16.Ptr(11736, 11742, 1), new Range16.Ptr(11823, 12293, 470), new Range16.Ptr(12294, 12337, 43), new Range16.Ptr(12338, 12341, 1), new Range16.Ptr(12347, 12348, 1), new Range16.Ptr(12353, 12438, 1), new Range16.Ptr(12445, 12447, 1), new Range16.Ptr(12449, 12538, 1), new Range16.Ptr(12540, 12543, 1), new Range16.Ptr(12549, 12589, 1), new Range16.Ptr(12593, 12686, 1), new Range16.Ptr(12704, 12730, 1), new Range16.Ptr(12784, 12799, 1), new Range16.Ptr(13312, 19893, 1), new Range16.Ptr(19968, 40908, 1), new Range16.Ptr(40960, 42124, 1), new Range16.Ptr(42192, 42237, 1), new Range16.Ptr(42240, 42508, 1), new Range16.Ptr(42512, 42527, 1), new Range16.Ptr(42538, 42539, 1), new Range16.Ptr(42560, 42606, 1), new Range16.Ptr(42623, 42647, 1), new Range16.Ptr(42656, 42725, 1), new Range16.Ptr(42775, 42783, 1), new Range16.Ptr(42786, 42888, 1), new Range16.Ptr(42891, 42894, 1), new Range16.Ptr(42896, 42899, 1), new Range16.Ptr(42912, 42922, 1), new Range16.Ptr(43000, 43009, 1), new Range16.Ptr(43011, 43013, 1), new Range16.Ptr(43015, 43018, 1), new Range16.Ptr(43020, 43042, 1), new Range16.Ptr(43072, 43123, 1), new Range16.Ptr(43138, 43187, 1), new Range16.Ptr(43250, 43255, 1), new Range16.Ptr(43259, 43274, 15), new Range16.Ptr(43275, 43301, 1), new Range16.Ptr(43312, 43334, 1), new Range16.Ptr(43360, 43388, 1), new Range16.Ptr(43396, 43442, 1), new Range16.Ptr(43471, 43520, 49), new Range16.Ptr(43521, 43560, 1), new Range16.Ptr(43584, 43586, 1), new Range16.Ptr(43588, 43595, 1), new Range16.Ptr(43616, 43638, 1), new Range16.Ptr(43642, 43648, 6), new Range16.Ptr(43649, 43695, 1), new Range16.Ptr(43697, 43701, 4), new Range16.Ptr(43702, 43705, 3), new Range16.Ptr(43706, 43709, 1), new Range16.Ptr(43712, 43714, 2), new Range16.Ptr(43739, 43741, 1), new Range16.Ptr(43744, 43754, 1), new Range16.Ptr(43762, 43764, 1), new Range16.Ptr(43777, 43782, 1), new Range16.Ptr(43785, 43790, 1), new Range16.Ptr(43793, 43798, 1), new Range16.Ptr(43808, 43814, 1), new Range16.Ptr(43816, 43822, 1), new Range16.Ptr(43968, 44002, 1), new Range16.Ptr(44032, 55203, 1), new Range16.Ptr(55216, 55238, 1), new Range16.Ptr(55243, 55291, 1), new Range16.Ptr(63744, 64109, 1), new Range16.Ptr(64112, 64217, 1), new Range16.Ptr(64256, 64262, 1), new Range16.Ptr(64275, 64279, 1), new Range16.Ptr(64285, 64287, 2), new Range16.Ptr(64288, 64296, 1), new Range16.Ptr(64298, 64310, 1), new Range16.Ptr(64312, 64316, 1), new Range16.Ptr(64318, 64320, 2), new Range16.Ptr(64321, 64323, 2), new Range16.Ptr(64324, 64326, 2), new Range16.Ptr(64327, 64433, 1), new Range16.Ptr(64467, 64829, 1), new Range16.Ptr(64848, 64911, 1), new Range16.Ptr(64914, 64967, 1), new Range16.Ptr(65008, 65019, 1), new Range16.Ptr(65136, 65140, 1), new Range16.Ptr(65142, 65276, 1), new Range16.Ptr(65313, 65338, 1), new Range16.Ptr(65345, 65370, 1), new Range16.Ptr(65382, 65470, 1), new Range16.Ptr(65474, 65479, 1), new Range16.Ptr(65482, 65487, 1), new Range16.Ptr(65490, 65495, 1), new Range16.Ptr(65498, 65500, 1)]), new ($sliceType(Range32))([new Range32.Ptr(65536, 65547, 1), new Range32.Ptr(65549, 65574, 1), new Range32.Ptr(65576, 65594, 1), new Range32.Ptr(65596, 65597, 1), new Range32.Ptr(65599, 65613, 1), new Range32.Ptr(65616, 65629, 1), new Range32.Ptr(65664, 65786, 1), new Range32.Ptr(66176, 66204, 1), new Range32.Ptr(66208, 66256, 1), new Range32.Ptr(66304, 66334, 1), new Range32.Ptr(66352, 66368, 1), new Range32.Ptr(66370, 66377, 1), new Range32.Ptr(66432, 66461, 1), new Range32.Ptr(66464, 66499, 1), new Range32.Ptr(66504, 66511, 1), new Range32.Ptr(66560, 66717, 1), new Range32.Ptr(67584, 67589, 1), new Range32.Ptr(67592, 67594, 2), new Range32.Ptr(67595, 67637, 1), new Range32.Ptr(67639, 67640, 1), new Range32.Ptr(67644, 67647, 3), new Range32.Ptr(67648, 67669, 1), new Range32.Ptr(67840, 67861, 1), new Range32.Ptr(67872, 67897, 1), new Range32.Ptr(67968, 68023, 1), new Range32.Ptr(68030, 68031, 1), new Range32.Ptr(68096, 68112, 16), new Range32.Ptr(68113, 68115, 1), new Range32.Ptr(68117, 68119, 1), new Range32.Ptr(68121, 68147, 1), new Range32.Ptr(68192, 68220, 1), new Range32.Ptr(68352, 68405, 1), new Range32.Ptr(68416, 68437, 1), new Range32.Ptr(68448, 68466, 1), new Range32.Ptr(68608, 68680, 1), new Range32.Ptr(69635, 69687, 1), new Range32.Ptr(69763, 69807, 1), new Range32.Ptr(69840, 69864, 1), new Range32.Ptr(69891, 69926, 1), new Range32.Ptr(70019, 70066, 1), new Range32.Ptr(70081, 70084, 1), new Range32.Ptr(71296, 71338, 1), new Range32.Ptr(73728, 74606, 1), new Range32.Ptr(77824, 78894, 1), new Range32.Ptr(92160, 92728, 1), new Range32.Ptr(93952, 94020, 1), new Range32.Ptr(94032, 94099, 67), new Range32.Ptr(94100, 94111, 1), new Range32.Ptr(110592, 110593, 1), new Range32.Ptr(119808, 119892, 1), new Range32.Ptr(119894, 119964, 1), new Range32.Ptr(119966, 119967, 1), new Range32.Ptr(119970, 119973, 3), new Range32.Ptr(119974, 119977, 3), new Range32.Ptr(119978, 119980, 1), new Range32.Ptr(119982, 119993, 1), new Range32.Ptr(119995, 119997, 2), new Range32.Ptr(119998, 120003, 1), new Range32.Ptr(120005, 120069, 1), new Range32.Ptr(120071, 120074, 1), new Range32.Ptr(120077, 120084, 1), new Range32.Ptr(120086, 120092, 1), new Range32.Ptr(120094, 120121, 1), new Range32.Ptr(120123, 120126, 1), new Range32.Ptr(120128, 120132, 1), new Range32.Ptr(120134, 120138, 4), new Range32.Ptr(120139, 120144, 1), new Range32.Ptr(120146, 120485, 1), new Range32.Ptr(120488, 120512, 1), new Range32.Ptr(120514, 120538, 1), new Range32.Ptr(120540, 120570, 1), new Range32.Ptr(120572, 120596, 1), new Range32.Ptr(120598, 120628, 1), new Range32.Ptr(120630, 120654, 1), new Range32.Ptr(120656, 120686, 1), new Range32.Ptr(120688, 120712, 1), new Range32.Ptr(120714, 120744, 1), new Range32.Ptr(120746, 120770, 1), new Range32.Ptr(120772, 120779, 1), new Range32.Ptr(126464, 126467, 1), new Range32.Ptr(126469, 126495, 1), new Range32.Ptr(126497, 126498, 1), new Range32.Ptr(126500, 126503, 3), new Range32.Ptr(126505, 126514, 1), new Range32.Ptr(126516, 126519, 1), new Range32.Ptr(126521, 126523, 2), new Range32.Ptr(126530, 126535, 5), new Range32.Ptr(126537, 126541, 2), new Range32.Ptr(126542, 126543, 1), new Range32.Ptr(126545, 126546, 1), new Range32.Ptr(126548, 126551, 3), new Range32.Ptr(126553, 126561, 2), new Range32.Ptr(126562, 126564, 2), new Range32.Ptr(126567, 126570, 1), new Range32.Ptr(126572, 126578, 1), new Range32.Ptr(126580, 126583, 1), new Range32.Ptr(126585, 126588, 1), new Range32.Ptr(126590, 126592, 2), new Range32.Ptr(126593, 126601, 1), new Range32.Ptr(126603, 126619, 1), new Range32.Ptr(126625, 126627, 1), new Range32.Ptr(126629, 126633, 1), new Range32.Ptr(126635, 126651, 1), new Range32.Ptr(131072, 173782, 1), new Range32.Ptr(173824, 177972, 1), new Range32.Ptr(177984, 178205, 1), new Range32.Ptr(194560, 195101, 1)]), 6);
		_Nd = new RangeTable.Ptr(new ($sliceType(Range16))([new Range16.Ptr(48, 57, 1), new Range16.Ptr(1632, 1641, 1), new Range16.Ptr(1776, 1785, 1), new Range16.Ptr(1984, 1993, 1), new Range16.Ptr(2406, 2415, 1), new Range16.Ptr(2534, 2543, 1), new Range16.Ptr(2662, 2671, 1), new Range16.Ptr(2790, 2799, 1), new Range16.Ptr(2918, 2927, 1), new Range16.Ptr(3046, 3055, 1), new Range16.Ptr(3174, 3183, 1), new Range16.Ptr(3302, 3311, 1), new Range16.Ptr(3430, 3439, 1), new Range16.Ptr(3664, 3673, 1), new Range16.Ptr(3792, 3801, 1), new Range16.Ptr(3872, 3881, 1), new Range16.Ptr(4160, 4169, 1), new Range16.Ptr(4240, 4249, 1), new Range16.Ptr(6112, 6121, 1), new Range16.Ptr(6160, 6169, 1), new Range16.Ptr(6470, 6479, 1), new Range16.Ptr(6608, 6617, 1), new Range16.Ptr(6784, 6793, 1), new Range16.Ptr(6800, 6809, 1), new Range16.Ptr(6992, 7001, 1), new Range16.Ptr(7088, 7097, 1), new Range16.Ptr(7232, 7241, 1), new Range16.Ptr(7248, 7257, 1), new Range16.Ptr(42528, 42537, 1), new Range16.Ptr(43216, 43225, 1), new Range16.Ptr(43264, 43273, 1), new Range16.Ptr(43472, 43481, 1), new Range16.Ptr(43600, 43609, 1), new Range16.Ptr(44016, 44025, 1), new Range16.Ptr(65296, 65305, 1)]), new ($sliceType(Range32))([new Range32.Ptr(66720, 66729, 1), new Range32.Ptr(69734, 69743, 1), new Range32.Ptr(69872, 69881, 1), new Range32.Ptr(69942, 69951, 1), new Range32.Ptr(70096, 70105, 1), new Range32.Ptr(71360, 71369, 1), new Range32.Ptr(120782, 120831, 1)]), 1);
		$pkg.Digit = _Nd;
		$pkg.Letter = _L;
		_CaseRanges = new ($sliceType(CaseRange))([new CaseRange.Ptr(65, 90, $toNativeArray("Int32", [0, 32, 0])), new CaseRange.Ptr(97, 122, $toNativeArray("Int32", [-32, 0, -32])), new CaseRange.Ptr(181, 181, $toNativeArray("Int32", [743, 0, 743])), new CaseRange.Ptr(192, 214, $toNativeArray("Int32", [0, 32, 0])), new CaseRange.Ptr(216, 222, $toNativeArray("Int32", [0, 32, 0])), new CaseRange.Ptr(224, 246, $toNativeArray("Int32", [-32, 0, -32])), new CaseRange.Ptr(248, 254, $toNativeArray("Int32", [-32, 0, -32])), new CaseRange.Ptr(255, 255, $toNativeArray("Int32", [121, 0, 121])), new CaseRange.Ptr(256, 303, $toNativeArray("Int32", [1114112, 1114112, 1114112])), new CaseRange.Ptr(304, 304, $toNativeArray("Int32", [0, -199, 0])), new CaseRange.Ptr(305, 305, $toNativeArray("Int32", [-232, 0, -232])), new CaseRange.Ptr(306, 311, $toNativeArray("Int32", [1114112, 1114112, 1114112])), new CaseRange.Ptr(313, 328, $toNativeArray("Int32", [1114112, 1114112, 1114112])), new CaseRange.Ptr(330, 375, $toNativeArray("Int32", [1114112, 1114112, 1114112])), new CaseRange.Ptr(376, 376, $toNativeArray("Int32", [0, -121, 0])), new CaseRange.Ptr(377, 382, $toNativeArray("Int32", [1114112, 1114112, 1114112])), new CaseRange.Ptr(383, 383, $toNativeArray("Int32", [-300, 0, -300])), new CaseRange.Ptr(384, 384, $toNativeArray("Int32", [195, 0, 195])), new CaseRange.Ptr(385, 385, $toNativeArray("Int32", [0, 210, 0])), new CaseRange.Ptr(386, 389, $toNativeArray("Int32", [1114112, 1114112, 1114112])), new CaseRange.Ptr(390, 390, $toNativeArray("Int32", [0, 206, 0])), new CaseRange.Ptr(391, 392, $toNativeArray("Int32", [1114112, 1114112, 1114112])), new CaseRange.Ptr(393, 394, $toNativeArray("Int32", [0, 205, 0])), new CaseRange.Ptr(395, 396, $toNativeArray("Int32", [1114112, 1114112, 1114112])), new CaseRange.Ptr(398, 398, $toNativeArray("Int32", [0, 79, 0])), new CaseRange.Ptr(399, 399, $toNativeArray("Int32", [0, 202, 0])), new CaseRange.Ptr(400, 400, $toNativeArray("Int32", [0, 203, 0])), new CaseRange.Ptr(401, 402, $toNativeArray("Int32", [1114112, 1114112, 1114112])), new CaseRange.Ptr(403, 403, $toNativeArray("Int32", [0, 205, 0])), new CaseRange.Ptr(404, 404, $toNativeArray("Int32", [0, 207, 0])), new CaseRange.Ptr(405, 405, $toNativeArray("Int32", [97, 0, 97])), new CaseRange.Ptr(406, 406, $toNativeArray("Int32", [0, 211, 0])), new CaseRange.Ptr(407, 407, $toNativeArray("Int32", [0, 209, 0])), new CaseRange.Ptr(408, 409, $toNativeArray("Int32", [1114112, 1114112, 1114112])), new CaseRange.Ptr(410, 410, $toNativeArray("Int32", [163, 0, 163])), new CaseRange.Ptr(412, 412, $toNativeArray("Int32", [0, 211, 0])), new CaseRange.Ptr(413, 413, $toNativeArray("Int32", [0, 213, 0])), new CaseRange.Ptr(414, 414, $toNativeArray("Int32", [130, 0, 130])), new CaseRange.Ptr(415, 415, $toNativeArray("Int32", [0, 214, 0])), new CaseRange.Ptr(416, 421, $toNativeArray("Int32", [1114112, 1114112, 1114112])), new CaseRange.Ptr(422, 422, $toNativeArray("Int32", [0, 218, 0])), new CaseRange.Ptr(423, 424, $toNativeArray("Int32", [1114112, 1114112, 1114112])), new CaseRange.Ptr(425, 425, $toNativeArray("Int32", [0, 218, 0])), new CaseRange.Ptr(428, 429, $toNativeArray("Int32", [1114112, 1114112, 1114112])), new CaseRange.Ptr(430, 430, $toNativeArray("Int32", [0, 218, 0])), new CaseRange.Ptr(431, 432, $toNativeArray("Int32", [1114112, 1114112, 1114112])), new CaseRange.Ptr(433, 434, $toNativeArray("Int32", [0, 217, 0])), new CaseRange.Ptr(435, 438, $toNativeArray("Int32", [1114112, 1114112, 1114112])), new CaseRange.Ptr(439, 439, $toNativeArray("Int32", [0, 219, 0])), new CaseRange.Ptr(440, 441, $toNativeArray("Int32", [1114112, 1114112, 1114112])), new CaseRange.Ptr(444, 445, $toNativeArray("Int32", [1114112, 1114112, 1114112])), new CaseRange.Ptr(447, 447, $toNativeArray("Int32", [56, 0, 56])), new CaseRange.Ptr(452, 452, $toNativeArray("Int32", [0, 2, 1])), new CaseRange.Ptr(453, 453, $toNativeArray("Int32", [-1, 1, 0])), new CaseRange.Ptr(454, 454, $toNativeArray("Int32", [-2, 0, -1])), new CaseRange.Ptr(455, 455, $toNativeArray("Int32", [0, 2, 1])), new CaseRange.Ptr(456, 456, $toNativeArray("Int32", [-1, 1, 0])), new CaseRange.Ptr(457, 457, $toNativeArray("Int32", [-2, 0, -1])), new CaseRange.Ptr(458, 458, $toNativeArray("Int32", [0, 2, 1])), new CaseRange.Ptr(459, 459, $toNativeArray("Int32", [-1, 1, 0])), new CaseRange.Ptr(460, 460, $toNativeArray("Int32", [-2, 0, -1])), new CaseRange.Ptr(461, 476, $toNativeArray("Int32", [1114112, 1114112, 1114112])), new CaseRange.Ptr(477, 477, $toNativeArray("Int32", [-79, 0, -79])), new CaseRange.Ptr(478, 495, $toNativeArray("Int32", [1114112, 1114112, 1114112])), new CaseRange.Ptr(497, 497, $toNativeArray("Int32", [0, 2, 1])), new CaseRange.Ptr(498, 498, $toNativeArray("Int32", [-1, 1, 0])), new CaseRange.Ptr(499, 499, $toNativeArray("Int32", [-2, 0, -1])), new CaseRange.Ptr(500, 501, $toNativeArray("Int32", [1114112, 1114112, 1114112])), new CaseRange.Ptr(502, 502, $toNativeArray("Int32", [0, -97, 0])), new CaseRange.Ptr(503, 503, $toNativeArray("Int32", [0, -56, 0])), new CaseRange.Ptr(504, 543, $toNativeArray("Int32", [1114112, 1114112, 1114112])), new CaseRange.Ptr(544, 544, $toNativeArray("Int32", [0, -130, 0])), new CaseRange.Ptr(546, 563, $toNativeArray("Int32", [1114112, 1114112, 1114112])), new CaseRange.Ptr(570, 570, $toNativeArray("Int32", [0, 10795, 0])), new CaseRange.Ptr(571, 572, $toNativeArray("Int32", [1114112, 1114112, 1114112])), new CaseRange.Ptr(573, 573, $toNativeArray("Int32", [0, -163, 0])), new CaseRange.Ptr(574, 574, $toNativeArray("Int32", [0, 10792, 0])), new CaseRange.Ptr(575, 576, $toNativeArray("Int32", [10815, 0, 10815])), new CaseRange.Ptr(577, 578, $toNativeArray("Int32", [1114112, 1114112, 1114112])), new CaseRange.Ptr(579, 579, $toNativeArray("Int32", [0, -195, 0])), new CaseRange.Ptr(580, 580, $toNativeArray("Int32", [0, 69, 0])), new CaseRange.Ptr(581, 581, $toNativeArray("Int32", [0, 71, 0])), new CaseRange.Ptr(582, 591, $toNativeArray("Int32", [1114112, 1114112, 1114112])), new CaseRange.Ptr(592, 592, $toNativeArray("Int32", [10783, 0, 10783])), new CaseRange.Ptr(593, 593, $toNativeArray("Int32", [10780, 0, 10780])), new CaseRange.Ptr(594, 594, $toNativeArray("Int32", [10782, 0, 10782])), new CaseRange.Ptr(595, 595, $toNativeArray("Int32", [-210, 0, -210])), new CaseRange.Ptr(596, 596, $toNativeArray("Int32", [-206, 0, -206])), new CaseRange.Ptr(598, 599, $toNativeArray("Int32", [-205, 0, -205])), new CaseRange.Ptr(601, 601, $toNativeArray("Int32", [-202, 0, -202])), new CaseRange.Ptr(603, 603, $toNativeArray("Int32", [-203, 0, -203])), new CaseRange.Ptr(608, 608, $toNativeArray("Int32", [-205, 0, -205])), new CaseRange.Ptr(611, 611, $toNativeArray("Int32", [-207, 0, -207])), new CaseRange.Ptr(613, 613, $toNativeArray("Int32", [42280, 0, 42280])), new CaseRange.Ptr(614, 614, $toNativeArray("Int32", [42308, 0, 42308])), new CaseRange.Ptr(616, 616, $toNativeArray("Int32", [-209, 0, -209])), new CaseRange.Ptr(617, 617, $toNativeArray("Int32", [-211, 0, -211])), new CaseRange.Ptr(619, 619, $toNativeArray("Int32", [10743, 0, 10743])), new CaseRange.Ptr(623, 623, $toNativeArray("Int32", [-211, 0, -211])), new CaseRange.Ptr(625, 625, $toNativeArray("Int32", [10749, 0, 10749])), new CaseRange.Ptr(626, 626, $toNativeArray("Int32", [-213, 0, -213])), new CaseRange.Ptr(629, 629, $toNativeArray("Int32", [-214, 0, -214])), new CaseRange.Ptr(637, 637, $toNativeArray("Int32", [10727, 0, 10727])), new CaseRange.Ptr(640, 640, $toNativeArray("Int32", [-218, 0, -218])), new CaseRange.Ptr(643, 643, $toNativeArray("Int32", [-218, 0, -218])), new CaseRange.Ptr(648, 648, $toNativeArray("Int32", [-218, 0, -218])), new CaseRange.Ptr(649, 649, $toNativeArray("Int32", [-69, 0, -69])), new CaseRange.Ptr(650, 651, $toNativeArray("Int32", [-217, 0, -217])), new CaseRange.Ptr(652, 652, $toNativeArray("Int32", [-71, 0, -71])), new CaseRange.Ptr(658, 658, $toNativeArray("Int32", [-219, 0, -219])), new CaseRange.Ptr(837, 837, $toNativeArray("Int32", [84, 0, 84])), new CaseRange.Ptr(880, 883, $toNativeArray("Int32", [1114112, 1114112, 1114112])), new CaseRange.Ptr(886, 887, $toNativeArray("Int32", [1114112, 1114112, 1114112])), new CaseRange.Ptr(891, 893, $toNativeArray("Int32", [130, 0, 130])), new CaseRange.Ptr(902, 902, $toNativeArray("Int32", [0, 38, 0])), new CaseRange.Ptr(904, 906, $toNativeArray("Int32", [0, 37, 0])), new CaseRange.Ptr(908, 908, $toNativeArray("Int32", [0, 64, 0])), new CaseRange.Ptr(910, 911, $toNativeArray("Int32", [0, 63, 0])), new CaseRange.Ptr(913, 929, $toNativeArray("Int32", [0, 32, 0])), new CaseRange.Ptr(931, 939, $toNativeArray("Int32", [0, 32, 0])), new CaseRange.Ptr(940, 940, $toNativeArray("Int32", [-38, 0, -38])), new CaseRange.Ptr(941, 943, $toNativeArray("Int32", [-37, 0, -37])), new CaseRange.Ptr(945, 961, $toNativeArray("Int32", [-32, 0, -32])), new CaseRange.Ptr(962, 962, $toNativeArray("Int32", [-31, 0, -31])), new CaseRange.Ptr(963, 971, $toNativeArray("Int32", [-32, 0, -32])), new CaseRange.Ptr(972, 972, $toNativeArray("Int32", [-64, 0, -64])), new CaseRange.Ptr(973, 974, $toNativeArray("Int32", [-63, 0, -63])), new CaseRange.Ptr(975, 975, $toNativeArray("Int32", [0, 8, 0])), new CaseRange.Ptr(976, 976, $toNativeArray("Int32", [-62, 0, -62])), new CaseRange.Ptr(977, 977, $toNativeArray("Int32", [-57, 0, -57])), new CaseRange.Ptr(981, 981, $toNativeArray("Int32", [-47, 0, -47])), new CaseRange.Ptr(982, 982, $toNativeArray("Int32", [-54, 0, -54])), new CaseRange.Ptr(983, 983, $toNativeArray("Int32", [-8, 0, -8])), new CaseRange.Ptr(984, 1007, $toNativeArray("Int32", [1114112, 1114112, 1114112])), new CaseRange.Ptr(1008, 1008, $toNativeArray("Int32", [-86, 0, -86])), new CaseRange.Ptr(1009, 1009, $toNativeArray("Int32", [-80, 0, -80])), new CaseRange.Ptr(1010, 1010, $toNativeArray("Int32", [7, 0, 7])), new CaseRange.Ptr(1012, 1012, $toNativeArray("Int32", [0, -60, 0])), new CaseRange.Ptr(1013, 1013, $toNativeArray("Int32", [-96, 0, -96])), new CaseRange.Ptr(1015, 1016, $toNativeArray("Int32", [1114112, 1114112, 1114112])), new CaseRange.Ptr(1017, 1017, $toNativeArray("Int32", [0, -7, 0])), new CaseRange.Ptr(1018, 1019, $toNativeArray("Int32", [1114112, 1114112, 1114112])), new CaseRange.Ptr(1021, 1023, $toNativeArray("Int32", [0, -130, 0])), new CaseRange.Ptr(1024, 1039, $toNativeArray("Int32", [0, 80, 0])), new CaseRange.Ptr(1040, 1071, $toNativeArray("Int32", [0, 32, 0])), new CaseRange.Ptr(1072, 1103, $toNativeArray("Int32", [-32, 0, -32])), new CaseRange.Ptr(1104, 1119, $toNativeArray("Int32", [-80, 0, -80])), new CaseRange.Ptr(1120, 1153, $toNativeArray("Int32", [1114112, 1114112, 1114112])), new CaseRange.Ptr(1162, 1215, $toNativeArray("Int32", [1114112, 1114112, 1114112])), new CaseRange.Ptr(1216, 1216, $toNativeArray("Int32", [0, 15, 0])), new CaseRange.Ptr(1217, 1230, $toNativeArray("Int32", [1114112, 1114112, 1114112])), new CaseRange.Ptr(1231, 1231, $toNativeArray("Int32", [-15, 0, -15])), new CaseRange.Ptr(1232, 1319, $toNativeArray("Int32", [1114112, 1114112, 1114112])), new CaseRange.Ptr(1329, 1366, $toNativeArray("Int32", [0, 48, 0])), new CaseRange.Ptr(1377, 1414, $toNativeArray("Int32", [-48, 0, -48])), new CaseRange.Ptr(4256, 4293, $toNativeArray("Int32", [0, 7264, 0])), new CaseRange.Ptr(4295, 4295, $toNativeArray("Int32", [0, 7264, 0])), new CaseRange.Ptr(4301, 4301, $toNativeArray("Int32", [0, 7264, 0])), new CaseRange.Ptr(7545, 7545, $toNativeArray("Int32", [35332, 0, 35332])), new CaseRange.Ptr(7549, 7549, $toNativeArray("Int32", [3814, 0, 3814])), new CaseRange.Ptr(7680, 7829, $toNativeArray("Int32", [1114112, 1114112, 1114112])), new CaseRange.Ptr(7835, 7835, $toNativeArray("Int32", [-59, 0, -59])), new CaseRange.Ptr(7838, 7838, $toNativeArray("Int32", [0, -7615, 0])), new CaseRange.Ptr(7840, 7935, $toNativeArray("Int32", [1114112, 1114112, 1114112])), new CaseRange.Ptr(7936, 7943, $toNativeArray("Int32", [8, 0, 8])), new CaseRange.Ptr(7944, 7951, $toNativeArray("Int32", [0, -8, 0])), new CaseRange.Ptr(7952, 7957, $toNativeArray("Int32", [8, 0, 8])), new CaseRange.Ptr(7960, 7965, $toNativeArray("Int32", [0, -8, 0])), new CaseRange.Ptr(7968, 7975, $toNativeArray("Int32", [8, 0, 8])), new CaseRange.Ptr(7976, 7983, $toNativeArray("Int32", [0, -8, 0])), new CaseRange.Ptr(7984, 7991, $toNativeArray("Int32", [8, 0, 8])), new CaseRange.Ptr(7992, 7999, $toNativeArray("Int32", [0, -8, 0])), new CaseRange.Ptr(8000, 8005, $toNativeArray("Int32", [8, 0, 8])), new CaseRange.Ptr(8008, 8013, $toNativeArray("Int32", [0, -8, 0])), new CaseRange.Ptr(8017, 8017, $toNativeArray("Int32", [8, 0, 8])), new CaseRange.Ptr(8019, 8019, $toNativeArray("Int32", [8, 0, 8])), new CaseRange.Ptr(8021, 8021, $toNativeArray("Int32", [8, 0, 8])), new CaseRange.Ptr(8023, 8023, $toNativeArray("Int32", [8, 0, 8])), new CaseRange.Ptr(8025, 8025, $toNativeArray("Int32", [0, -8, 0])), new CaseRange.Ptr(8027, 8027, $toNativeArray("Int32", [0, -8, 0])), new CaseRange.Ptr(8029, 8029, $toNativeArray("Int32", [0, -8, 0])), new CaseRange.Ptr(8031, 8031, $toNativeArray("Int32", [0, -8, 0])), new CaseRange.Ptr(8032, 8039, $toNativeArray("Int32", [8, 0, 8])), new CaseRange.Ptr(8040, 8047, $toNativeArray("Int32", [0, -8, 0])), new CaseRange.Ptr(8048, 8049, $toNativeArray("Int32", [74, 0, 74])), new CaseRange.Ptr(8050, 8053, $toNativeArray("Int32", [86, 0, 86])), new CaseRange.Ptr(8054, 8055, $toNativeArray("Int32", [100, 0, 100])), new CaseRange.Ptr(8056, 8057, $toNativeArray("Int32", [128, 0, 128])), new CaseRange.Ptr(8058, 8059, $toNativeArray("Int32", [112, 0, 112])), new CaseRange.Ptr(8060, 8061, $toNativeArray("Int32", [126, 0, 126])), new CaseRange.Ptr(8064, 8071, $toNativeArray("Int32", [8, 0, 8])), new CaseRange.Ptr(8072, 8079, $toNativeArray("Int32", [0, -8, 0])), new CaseRange.Ptr(8080, 8087, $toNativeArray("Int32", [8, 0, 8])), new CaseRange.Ptr(8088, 8095, $toNativeArray("Int32", [0, -8, 0])), new CaseRange.Ptr(8096, 8103, $toNativeArray("Int32", [8, 0, 8])), new CaseRange.Ptr(8104, 8111, $toNativeArray("Int32", [0, -8, 0])), new CaseRange.Ptr(8112, 8113, $toNativeArray("Int32", [8, 0, 8])), new CaseRange.Ptr(8115, 8115, $toNativeArray("Int32", [9, 0, 9])), new CaseRange.Ptr(8120, 8121, $toNativeArray("Int32", [0, -8, 0])), new CaseRange.Ptr(8122, 8123, $toNativeArray("Int32", [0, -74, 0])), new CaseRange.Ptr(8124, 8124, $toNativeArray("Int32", [0, -9, 0])), new CaseRange.Ptr(8126, 8126, $toNativeArray("Int32", [-7205, 0, -7205])), new CaseRange.Ptr(8131, 8131, $toNativeArray("Int32", [9, 0, 9])), new CaseRange.Ptr(8136, 8139, $toNativeArray("Int32", [0, -86, 0])), new CaseRange.Ptr(8140, 8140, $toNativeArray("Int32", [0, -9, 0])), new CaseRange.Ptr(8144, 8145, $toNativeArray("Int32", [8, 0, 8])), new CaseRange.Ptr(8152, 8153, $toNativeArray("Int32", [0, -8, 0])), new CaseRange.Ptr(8154, 8155, $toNativeArray("Int32", [0, -100, 0])), new CaseRange.Ptr(8160, 8161, $toNativeArray("Int32", [8, 0, 8])), new CaseRange.Ptr(8165, 8165, $toNativeArray("Int32", [7, 0, 7])), new CaseRange.Ptr(8168, 8169, $toNativeArray("Int32", [0, -8, 0])), new CaseRange.Ptr(8170, 8171, $toNativeArray("Int32", [0, -112, 0])), new CaseRange.Ptr(8172, 8172, $toNativeArray("Int32", [0, -7, 0])), new CaseRange.Ptr(8179, 8179, $toNativeArray("Int32", [9, 0, 9])), new CaseRange.Ptr(8184, 8185, $toNativeArray("Int32", [0, -128, 0])), new CaseRange.Ptr(8186, 8187, $toNativeArray("Int32", [0, -126, 0])), new CaseRange.Ptr(8188, 8188, $toNativeArray("Int32", [0, -9, 0])), new CaseRange.Ptr(8486, 8486, $toNativeArray("Int32", [0, -7517, 0])), new CaseRange.Ptr(8490, 8490, $toNativeArray("Int32", [0, -8383, 0])), new CaseRange.Ptr(8491, 8491, $toNativeArray("Int32", [0, -8262, 0])), new CaseRange.Ptr(8498, 8498, $toNativeArray("Int32", [0, 28, 0])), new CaseRange.Ptr(8526, 8526, $toNativeArray("Int32", [-28, 0, -28])), new CaseRange.Ptr(8544, 8559, $toNativeArray("Int32", [0, 16, 0])), new CaseRange.Ptr(8560, 8575, $toNativeArray("Int32", [-16, 0, -16])), new CaseRange.Ptr(8579, 8580, $toNativeArray("Int32", [1114112, 1114112, 1114112])), new CaseRange.Ptr(9398, 9423, $toNativeArray("Int32", [0, 26, 0])), new CaseRange.Ptr(9424, 9449, $toNativeArray("Int32", [-26, 0, -26])), new CaseRange.Ptr(11264, 11310, $toNativeArray("Int32", [0, 48, 0])), new CaseRange.Ptr(11312, 11358, $toNativeArray("Int32", [-48, 0, -48])), new CaseRange.Ptr(11360, 11361, $toNativeArray("Int32", [1114112, 1114112, 1114112])), new CaseRange.Ptr(11362, 11362, $toNativeArray("Int32", [0, -10743, 0])), new CaseRange.Ptr(11363, 11363, $toNativeArray("Int32", [0, -3814, 0])), new CaseRange.Ptr(11364, 11364, $toNativeArray("Int32", [0, -10727, 0])), new CaseRange.Ptr(11365, 11365, $toNativeArray("Int32", [-10795, 0, -10795])), new CaseRange.Ptr(11366, 11366, $toNativeArray("Int32", [-10792, 0, -10792])), new CaseRange.Ptr(11367, 11372, $toNativeArray("Int32", [1114112, 1114112, 1114112])), new CaseRange.Ptr(11373, 11373, $toNativeArray("Int32", [0, -10780, 0])), new CaseRange.Ptr(11374, 11374, $toNativeArray("Int32", [0, -10749, 0])), new CaseRange.Ptr(11375, 11375, $toNativeArray("Int32", [0, -10783, 0])), new CaseRange.Ptr(11376, 11376, $toNativeArray("Int32", [0, -10782, 0])), new CaseRange.Ptr(11378, 11379, $toNativeArray("Int32", [1114112, 1114112, 1114112])), new CaseRange.Ptr(11381, 11382, $toNativeArray("Int32", [1114112, 1114112, 1114112])), new CaseRange.Ptr(11390, 11391, $toNativeArray("Int32", [0, -10815, 0])), new CaseRange.Ptr(11392, 11491, $toNativeArray("Int32", [1114112, 1114112, 1114112])), new CaseRange.Ptr(11499, 11502, $toNativeArray("Int32", [1114112, 1114112, 1114112])), new CaseRange.Ptr(11506, 11507, $toNativeArray("Int32", [1114112, 1114112, 1114112])), new CaseRange.Ptr(11520, 11557, $toNativeArray("Int32", [-7264, 0, -7264])), new CaseRange.Ptr(11559, 11559, $toNativeArray("Int32", [-7264, 0, -7264])), new CaseRange.Ptr(11565, 11565, $toNativeArray("Int32", [-7264, 0, -7264])), new CaseRange.Ptr(42560, 42605, $toNativeArray("Int32", [1114112, 1114112, 1114112])), new CaseRange.Ptr(42624, 42647, $toNativeArray("Int32", [1114112, 1114112, 1114112])), new CaseRange.Ptr(42786, 42799, $toNativeArray("Int32", [1114112, 1114112, 1114112])), new CaseRange.Ptr(42802, 42863, $toNativeArray("Int32", [1114112, 1114112, 1114112])), new CaseRange.Ptr(42873, 42876, $toNativeArray("Int32", [1114112, 1114112, 1114112])), new CaseRange.Ptr(42877, 42877, $toNativeArray("Int32", [0, -35332, 0])), new CaseRange.Ptr(42878, 42887, $toNativeArray("Int32", [1114112, 1114112, 1114112])), new CaseRange.Ptr(42891, 42892, $toNativeArray("Int32", [1114112, 1114112, 1114112])), new CaseRange.Ptr(42893, 42893, $toNativeArray("Int32", [0, -42280, 0])), new CaseRange.Ptr(42896, 42899, $toNativeArray("Int32", [1114112, 1114112, 1114112])), new CaseRange.Ptr(42912, 42921, $toNativeArray("Int32", [1114112, 1114112, 1114112])), new CaseRange.Ptr(42922, 42922, $toNativeArray("Int32", [0, -42308, 0])), new CaseRange.Ptr(65313, 65338, $toNativeArray("Int32", [0, 32, 0])), new CaseRange.Ptr(65345, 65370, $toNativeArray("Int32", [-32, 0, -32])), new CaseRange.Ptr(66560, 66599, $toNativeArray("Int32", [0, 40, 0])), new CaseRange.Ptr(66600, 66639, $toNativeArray("Int32", [-40, 0, -40]))]);
		$pkg.CaseRanges = _CaseRanges;
		properties = $toNativeArray("Uint8", [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 144, 130, 130, 130, 136, 130, 130, 130, 130, 130, 130, 136, 130, 130, 130, 130, 132, 132, 132, 132, 132, 132, 132, 132, 132, 132, 130, 130, 136, 136, 136, 130, 130, 160, 160, 160, 160, 160, 160, 160, 160, 160, 160, 160, 160, 160, 160, 160, 160, 160, 160, 160, 160, 160, 160, 160, 160, 160, 160, 130, 130, 130, 136, 130, 136, 192, 192, 192, 192, 192, 192, 192, 192, 192, 192, 192, 192, 192, 192, 192, 192, 192, 192, 192, 192, 192, 192, 192, 192, 192, 192, 130, 136, 130, 136, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 16, 130, 136, 136, 136, 136, 136, 130, 136, 136, 224, 130, 136, 0, 136, 136, 136, 136, 132, 132, 136, 192, 130, 130, 136, 132, 224, 130, 132, 132, 132, 130, 160, 160, 160, 160, 160, 160, 160, 160, 160, 160, 160, 160, 160, 160, 160, 160, 160, 160, 160, 160, 160, 160, 160, 136, 160, 160, 160, 160, 160, 160, 160, 192, 192, 192, 192, 192, 192, 192, 192, 192, 192, 192, 192, 192, 192, 192, 192, 192, 192, 192, 192, 192, 192, 192, 192, 136, 192, 192, 192, 192, 192, 192, 192, 192]);
		caseOrbit = new ($sliceType(foldPair))([new foldPair.Ptr(75, 107), new foldPair.Ptr(83, 115), new foldPair.Ptr(107, 8490), new foldPair.Ptr(115, 383), new foldPair.Ptr(181, 924), new foldPair.Ptr(197, 229), new foldPair.Ptr(223, 7838), new foldPair.Ptr(229, 8491), new foldPair.Ptr(304, 304), new foldPair.Ptr(305, 305), new foldPair.Ptr(383, 83), new foldPair.Ptr(452, 453), new foldPair.Ptr(453, 454), new foldPair.Ptr(454, 452), new foldPair.Ptr(455, 456), new foldPair.Ptr(456, 457), new foldPair.Ptr(457, 455), new foldPair.Ptr(458, 459), new foldPair.Ptr(459, 460), new foldPair.Ptr(460, 458), new foldPair.Ptr(497, 498), new foldPair.Ptr(498, 499), new foldPair.Ptr(499, 497), new foldPair.Ptr(837, 921), new foldPair.Ptr(914, 946), new foldPair.Ptr(917, 949), new foldPair.Ptr(920, 952), new foldPair.Ptr(921, 953), new foldPair.Ptr(922, 954), new foldPair.Ptr(924, 956), new foldPair.Ptr(928, 960), new foldPair.Ptr(929, 961), new foldPair.Ptr(931, 962), new foldPair.Ptr(934, 966), new foldPair.Ptr(937, 969), new foldPair.Ptr(946, 976), new foldPair.Ptr(949, 1013), new foldPair.Ptr(952, 977), new foldPair.Ptr(953, 8126), new foldPair.Ptr(954, 1008), new foldPair.Ptr(956, 181), new foldPair.Ptr(960, 982), new foldPair.Ptr(961, 1009), new foldPair.Ptr(962, 963), new foldPair.Ptr(963, 931), new foldPair.Ptr(966, 981), new foldPair.Ptr(969, 8486), new foldPair.Ptr(976, 914), new foldPair.Ptr(977, 1012), new foldPair.Ptr(981, 934), new foldPair.Ptr(982, 928), new foldPair.Ptr(1008, 922), new foldPair.Ptr(1009, 929), new foldPair.Ptr(1012, 920), new foldPair.Ptr(1013, 917), new foldPair.Ptr(7776, 7777), new foldPair.Ptr(7777, 7835), new foldPair.Ptr(7835, 7776), new foldPair.Ptr(7838, 223), new foldPair.Ptr(8126, 837), new foldPair.Ptr(8486, 937), new foldPair.Ptr(8490, 75), new foldPair.Ptr(8491, 197)]);
	};
	return $pkg;
})();
$packages["unicode/utf8"] = (function() {
	var $pkg = {}, decodeRuneInternal, decodeRuneInStringInternal, DecodeRune, DecodeRuneInString, DecodeLastRune, RuneLen, EncodeRune, RuneCountInString, RuneStart;
	decodeRuneInternal = function(p) {
		var r, size, short$1, n, _tmp, _tmp$1, _tmp$2, c0, _tmp$3, _tmp$4, _tmp$5, _tmp$6, _tmp$7, _tmp$8, _tmp$9, _tmp$10, _tmp$11, c1, _tmp$12, _tmp$13, _tmp$14, _tmp$15, _tmp$16, _tmp$17, _tmp$18, _tmp$19, _tmp$20, _tmp$21, _tmp$22, _tmp$23, c2, _tmp$24, _tmp$25, _tmp$26, _tmp$27, _tmp$28, _tmp$29, _tmp$30, _tmp$31, _tmp$32, _tmp$33, _tmp$34, _tmp$35, _tmp$36, _tmp$37, _tmp$38, c3, _tmp$39, _tmp$40, _tmp$41, _tmp$42, _tmp$43, _tmp$44, _tmp$45, _tmp$46, _tmp$47, _tmp$48, _tmp$49, _tmp$50;
		r = 0;
		size = 0;
		short$1 = false;
		n = p.length;
		if (n < 1) {
			_tmp = 65533; _tmp$1 = 0; _tmp$2 = true; r = _tmp; size = _tmp$1; short$1 = _tmp$2;
			return [r, size, short$1];
		}
		c0 = ((0 < 0 || 0 >= p.length) ? $throwRuntimeError("index out of range") : p.array[p.offset + 0]);
		if (c0 < 128) {
			_tmp$3 = (c0 >> 0); _tmp$4 = 1; _tmp$5 = false; r = _tmp$3; size = _tmp$4; short$1 = _tmp$5;
			return [r, size, short$1];
		}
		if (c0 < 192) {
			_tmp$6 = 65533; _tmp$7 = 1; _tmp$8 = false; r = _tmp$6; size = _tmp$7; short$1 = _tmp$8;
			return [r, size, short$1];
		}
		if (n < 2) {
			_tmp$9 = 65533; _tmp$10 = 1; _tmp$11 = true; r = _tmp$9; size = _tmp$10; short$1 = _tmp$11;
			return [r, size, short$1];
		}
		c1 = ((1 < 0 || 1 >= p.length) ? $throwRuntimeError("index out of range") : p.array[p.offset + 1]);
		if (c1 < 128 || 192 <= c1) {
			_tmp$12 = 65533; _tmp$13 = 1; _tmp$14 = false; r = _tmp$12; size = _tmp$13; short$1 = _tmp$14;
			return [r, size, short$1];
		}
		if (c0 < 224) {
			r = ((((c0 & 31) >>> 0) >> 0) << 6 >> 0) | (((c1 & 63) >>> 0) >> 0);
			if (r <= 127) {
				_tmp$15 = 65533; _tmp$16 = 1; _tmp$17 = false; r = _tmp$15; size = _tmp$16; short$1 = _tmp$17;
				return [r, size, short$1];
			}
			_tmp$18 = r; _tmp$19 = 2; _tmp$20 = false; r = _tmp$18; size = _tmp$19; short$1 = _tmp$20;
			return [r, size, short$1];
		}
		if (n < 3) {
			_tmp$21 = 65533; _tmp$22 = 1; _tmp$23 = true; r = _tmp$21; size = _tmp$22; short$1 = _tmp$23;
			return [r, size, short$1];
		}
		c2 = ((2 < 0 || 2 >= p.length) ? $throwRuntimeError("index out of range") : p.array[p.offset + 2]);
		if (c2 < 128 || 192 <= c2) {
			_tmp$24 = 65533; _tmp$25 = 1; _tmp$26 = false; r = _tmp$24; size = _tmp$25; short$1 = _tmp$26;
			return [r, size, short$1];
		}
		if (c0 < 240) {
			r = (((((c0 & 15) >>> 0) >> 0) << 12 >> 0) | ((((c1 & 63) >>> 0) >> 0) << 6 >> 0)) | (((c2 & 63) >>> 0) >> 0);
			if (r <= 2047) {
				_tmp$27 = 65533; _tmp$28 = 1; _tmp$29 = false; r = _tmp$27; size = _tmp$28; short$1 = _tmp$29;
				return [r, size, short$1];
			}
			if (55296 <= r && r <= 57343) {
				_tmp$30 = 65533; _tmp$31 = 1; _tmp$32 = false; r = _tmp$30; size = _tmp$31; short$1 = _tmp$32;
				return [r, size, short$1];
			}
			_tmp$33 = r; _tmp$34 = 3; _tmp$35 = false; r = _tmp$33; size = _tmp$34; short$1 = _tmp$35;
			return [r, size, short$1];
		}
		if (n < 4) {
			_tmp$36 = 65533; _tmp$37 = 1; _tmp$38 = true; r = _tmp$36; size = _tmp$37; short$1 = _tmp$38;
			return [r, size, short$1];
		}
		c3 = ((3 < 0 || 3 >= p.length) ? $throwRuntimeError("index out of range") : p.array[p.offset + 3]);
		if (c3 < 128 || 192 <= c3) {
			_tmp$39 = 65533; _tmp$40 = 1; _tmp$41 = false; r = _tmp$39; size = _tmp$40; short$1 = _tmp$41;
			return [r, size, short$1];
		}
		if (c0 < 248) {
			r = ((((((c0 & 7) >>> 0) >> 0) << 18 >> 0) | ((((c1 & 63) >>> 0) >> 0) << 12 >> 0)) | ((((c2 & 63) >>> 0) >> 0) << 6 >> 0)) | (((c3 & 63) >>> 0) >> 0);
			if (r <= 65535 || 1114111 < r) {
				_tmp$42 = 65533; _tmp$43 = 1; _tmp$44 = false; r = _tmp$42; size = _tmp$43; short$1 = _tmp$44;
				return [r, size, short$1];
			}
			_tmp$45 = r; _tmp$46 = 4; _tmp$47 = false; r = _tmp$45; size = _tmp$46; short$1 = _tmp$47;
			return [r, size, short$1];
		}
		_tmp$48 = 65533; _tmp$49 = 1; _tmp$50 = false; r = _tmp$48; size = _tmp$49; short$1 = _tmp$50;
		return [r, size, short$1];
	};
	decodeRuneInStringInternal = function(s) {
		var r, size, short$1, n, _tmp, _tmp$1, _tmp$2, c0, _tmp$3, _tmp$4, _tmp$5, _tmp$6, _tmp$7, _tmp$8, _tmp$9, _tmp$10, _tmp$11, c1, _tmp$12, _tmp$13, _tmp$14, _tmp$15, _tmp$16, _tmp$17, _tmp$18, _tmp$19, _tmp$20, _tmp$21, _tmp$22, _tmp$23, c2, _tmp$24, _tmp$25, _tmp$26, _tmp$27, _tmp$28, _tmp$29, _tmp$30, _tmp$31, _tmp$32, _tmp$33, _tmp$34, _tmp$35, _tmp$36, _tmp$37, _tmp$38, c3, _tmp$39, _tmp$40, _tmp$41, _tmp$42, _tmp$43, _tmp$44, _tmp$45, _tmp$46, _tmp$47, _tmp$48, _tmp$49, _tmp$50;
		r = 0;
		size = 0;
		short$1 = false;
		n = s.length;
		if (n < 1) {
			_tmp = 65533; _tmp$1 = 0; _tmp$2 = true; r = _tmp; size = _tmp$1; short$1 = _tmp$2;
			return [r, size, short$1];
		}
		c0 = s.charCodeAt(0);
		if (c0 < 128) {
			_tmp$3 = (c0 >> 0); _tmp$4 = 1; _tmp$5 = false; r = _tmp$3; size = _tmp$4; short$1 = _tmp$5;
			return [r, size, short$1];
		}
		if (c0 < 192) {
			_tmp$6 = 65533; _tmp$7 = 1; _tmp$8 = false; r = _tmp$6; size = _tmp$7; short$1 = _tmp$8;
			return [r, size, short$1];
		}
		if (n < 2) {
			_tmp$9 = 65533; _tmp$10 = 1; _tmp$11 = true; r = _tmp$9; size = _tmp$10; short$1 = _tmp$11;
			return [r, size, short$1];
		}
		c1 = s.charCodeAt(1);
		if (c1 < 128 || 192 <= c1) {
			_tmp$12 = 65533; _tmp$13 = 1; _tmp$14 = false; r = _tmp$12; size = _tmp$13; short$1 = _tmp$14;
			return [r, size, short$1];
		}
		if (c0 < 224) {
			r = ((((c0 & 31) >>> 0) >> 0) << 6 >> 0) | (((c1 & 63) >>> 0) >> 0);
			if (r <= 127) {
				_tmp$15 = 65533; _tmp$16 = 1; _tmp$17 = false; r = _tmp$15; size = _tmp$16; short$1 = _tmp$17;
				return [r, size, short$1];
			}
			_tmp$18 = r; _tmp$19 = 2; _tmp$20 = false; r = _tmp$18; size = _tmp$19; short$1 = _tmp$20;
			return [r, size, short$1];
		}
		if (n < 3) {
			_tmp$21 = 65533; _tmp$22 = 1; _tmp$23 = true; r = _tmp$21; size = _tmp$22; short$1 = _tmp$23;
			return [r, size, short$1];
		}
		c2 = s.charCodeAt(2);
		if (c2 < 128 || 192 <= c2) {
			_tmp$24 = 65533; _tmp$25 = 1; _tmp$26 = false; r = _tmp$24; size = _tmp$25; short$1 = _tmp$26;
			return [r, size, short$1];
		}
		if (c0 < 240) {
			r = (((((c0 & 15) >>> 0) >> 0) << 12 >> 0) | ((((c1 & 63) >>> 0) >> 0) << 6 >> 0)) | (((c2 & 63) >>> 0) >> 0);
			if (r <= 2047) {
				_tmp$27 = 65533; _tmp$28 = 1; _tmp$29 = false; r = _tmp$27; size = _tmp$28; short$1 = _tmp$29;
				return [r, size, short$1];
			}
			if (55296 <= r && r <= 57343) {
				_tmp$30 = 65533; _tmp$31 = 1; _tmp$32 = false; r = _tmp$30; size = _tmp$31; short$1 = _tmp$32;
				return [r, size, short$1];
			}
			_tmp$33 = r; _tmp$34 = 3; _tmp$35 = false; r = _tmp$33; size = _tmp$34; short$1 = _tmp$35;
			return [r, size, short$1];
		}
		if (n < 4) {
			_tmp$36 = 65533; _tmp$37 = 1; _tmp$38 = true; r = _tmp$36; size = _tmp$37; short$1 = _tmp$38;
			return [r, size, short$1];
		}
		c3 = s.charCodeAt(3);
		if (c3 < 128 || 192 <= c3) {
			_tmp$39 = 65533; _tmp$40 = 1; _tmp$41 = false; r = _tmp$39; size = _tmp$40; short$1 = _tmp$41;
			return [r, size, short$1];
		}
		if (c0 < 248) {
			r = ((((((c0 & 7) >>> 0) >> 0) << 18 >> 0) | ((((c1 & 63) >>> 0) >> 0) << 12 >> 0)) | ((((c2 & 63) >>> 0) >> 0) << 6 >> 0)) | (((c3 & 63) >>> 0) >> 0);
			if (r <= 65535 || 1114111 < r) {
				_tmp$42 = 65533; _tmp$43 = 1; _tmp$44 = false; r = _tmp$42; size = _tmp$43; short$1 = _tmp$44;
				return [r, size, short$1];
			}
			_tmp$45 = r; _tmp$46 = 4; _tmp$47 = false; r = _tmp$45; size = _tmp$46; short$1 = _tmp$47;
			return [r, size, short$1];
		}
		_tmp$48 = 65533; _tmp$49 = 1; _tmp$50 = false; r = _tmp$48; size = _tmp$49; short$1 = _tmp$50;
		return [r, size, short$1];
	};
	DecodeRune = $pkg.DecodeRune = function(p) {
		var r, size, _tuple;
		r = 0;
		size = 0;
		_tuple = decodeRuneInternal(p); r = _tuple[0]; size = _tuple[1];
		return [r, size];
	};
	DecodeRuneInString = $pkg.DecodeRuneInString = function(s) {
		var r, size, _tuple;
		r = 0;
		size = 0;
		_tuple = decodeRuneInStringInternal(s); r = _tuple[0]; size = _tuple[1];
		return [r, size];
	};
	DecodeLastRune = $pkg.DecodeLastRune = function(p) {
		var r, size, end, _tmp, _tmp$1, start, _tmp$2, _tmp$3, lim, _tuple, _tmp$4, _tmp$5, _tmp$6, _tmp$7;
		r = 0;
		size = 0;
		end = p.length;
		if (end === 0) {
			_tmp = 65533; _tmp$1 = 0; r = _tmp; size = _tmp$1;
			return [r, size];
		}
		start = end - 1 >> 0;
		r = (((start < 0 || start >= p.length) ? $throwRuntimeError("index out of range") : p.array[p.offset + start]) >> 0);
		if (r < 128) {
			_tmp$2 = r; _tmp$3 = 1; r = _tmp$2; size = _tmp$3;
			return [r, size];
		}
		lim = end - 4 >> 0;
		if (lim < 0) {
			lim = 0;
		}
		start = start - 1 >> 0;
		while (start >= lim) {
			if (RuneStart(((start < 0 || start >= p.length) ? $throwRuntimeError("index out of range") : p.array[p.offset + start]))) {
				break;
			}
			start = start - 1 >> 0;
		}
		if (start < 0) {
			start = 0;
		}
		_tuple = DecodeRune($subslice(p, start, end)); r = _tuple[0]; size = _tuple[1];
		if (!(((start + size >> 0) === end))) {
			_tmp$4 = 65533; _tmp$5 = 1; r = _tmp$4; size = _tmp$5;
			return [r, size];
		}
		_tmp$6 = r; _tmp$7 = size; r = _tmp$6; size = _tmp$7;
		return [r, size];
	};
	RuneLen = $pkg.RuneLen = function(r) {
		if (r < 0) {
			return -1;
		} else if (r <= 127) {
			return 1;
		} else if (r <= 2047) {
			return 2;
		} else if (55296 <= r && r <= 57343) {
			return -1;
		} else if (r <= 65535) {
			return 3;
		} else if (r <= 1114111) {
			return 4;
		}
		return -1;
	};
	EncodeRune = $pkg.EncodeRune = function(p, r) {
		if ((r >>> 0) <= 127) {
			(0 < 0 || 0 >= p.length) ? $throwRuntimeError("index out of range") : p.array[p.offset + 0] = (r << 24 >>> 24);
			return 1;
		}
		if ((r >>> 0) <= 2047) {
			(0 < 0 || 0 >= p.length) ? $throwRuntimeError("index out of range") : p.array[p.offset + 0] = (192 | ((r >> 6 >> 0) << 24 >>> 24)) >>> 0;
			(1 < 0 || 1 >= p.length) ? $throwRuntimeError("index out of range") : p.array[p.offset + 1] = (128 | (((r << 24 >>> 24) & 63) >>> 0)) >>> 0;
			return 2;
		}
		if ((r >>> 0) > 1114111) {
			r = 65533;
		}
		if (55296 <= r && r <= 57343) {
			r = 65533;
		}
		if ((r >>> 0) <= 65535) {
			(0 < 0 || 0 >= p.length) ? $throwRuntimeError("index out of range") : p.array[p.offset + 0] = (224 | ((r >> 12 >> 0) << 24 >>> 24)) >>> 0;
			(1 < 0 || 1 >= p.length) ? $throwRuntimeError("index out of range") : p.array[p.offset + 1] = (128 | ((((r >> 6 >> 0) << 24 >>> 24) & 63) >>> 0)) >>> 0;
			(2 < 0 || 2 >= p.length) ? $throwRuntimeError("index out of range") : p.array[p.offset + 2] = (128 | (((r << 24 >>> 24) & 63) >>> 0)) >>> 0;
			return 3;
		}
		(0 < 0 || 0 >= p.length) ? $throwRuntimeError("index out of range") : p.array[p.offset + 0] = (240 | ((r >> 18 >> 0) << 24 >>> 24)) >>> 0;
		(1 < 0 || 1 >= p.length) ? $throwRuntimeError("index out of range") : p.array[p.offset + 1] = (128 | ((((r >> 12 >> 0) << 24 >>> 24) & 63) >>> 0)) >>> 0;
		(2 < 0 || 2 >= p.length) ? $throwRuntimeError("index out of range") : p.array[p.offset + 2] = (128 | ((((r >> 6 >> 0) << 24 >>> 24) & 63) >>> 0)) >>> 0;
		(3 < 0 || 3 >= p.length) ? $throwRuntimeError("index out of range") : p.array[p.offset + 3] = (128 | (((r << 24 >>> 24) & 63) >>> 0)) >>> 0;
		return 4;
	};
	RuneCountInString = $pkg.RuneCountInString = function(s) {
		var n, _ref, _i, _rune;
		n = 0;
		_ref = s;
		_i = 0;
		while (_i < _ref.length) {
			_rune = $decodeRune(_ref, _i);
			n = n + 1 >> 0;
			_i += _rune[1];
		}
		return n;
	};
	RuneStart = $pkg.RuneStart = function(b) {
		return !((((b & 192) >>> 0) === 128));
	};
	$pkg.init = function() {
	};
	return $pkg;
})();
$packages["bytes"] = (function() {
	var $pkg = {}, errors = $packages["errors"], io = $packages["io"], utf8 = $packages["unicode/utf8"], unicode = $packages["unicode"], Buffer, readOp, IndexByte, makeSlice, Map;
	Buffer = $pkg.Buffer = $newType(0, "Struct", "bytes.Buffer", "Buffer", "bytes", function(buf_, off_, runeBytes_, bootstrap_, lastRead_) {
		this.$val = this;
		this.buf = buf_ !== undefined ? buf_ : ($sliceType($Uint8)).nil;
		this.off = off_ !== undefined ? off_ : 0;
		this.runeBytes = runeBytes_ !== undefined ? runeBytes_ : $makeNativeArray("Uint8", 4, function() { return 0; });
		this.bootstrap = bootstrap_ !== undefined ? bootstrap_ : $makeNativeArray("Uint8", 64, function() { return 0; });
		this.lastRead = lastRead_ !== undefined ? lastRead_ : 0;
	});
	readOp = $pkg.readOp = $newType(4, "Int", "bytes.readOp", "readOp", "bytes", null);
	IndexByte = $pkg.IndexByte = function(s, c) {
		var _ref, _i, b, i;
		_ref = s;
		_i = 0;
		while (_i < _ref.length) {
			b = ((_i < 0 || _i >= _ref.length) ? $throwRuntimeError("index out of range") : _ref.array[_ref.offset + _i]);
			i = _i;
			if (b === c) {
				return i;
			}
			_i++;
		}
		return -1;
	};
	Buffer.Ptr.prototype.Bytes = function() {
		var b;
		b = this;
		return $subslice(b.buf, b.off);
	};
	Buffer.prototype.Bytes = function() { return this.$val.Bytes(); };
	Buffer.Ptr.prototype.String = function() {
		var b;
		b = this;
		if (b === ($ptrType(Buffer)).nil) {
			return "<nil>";
		}
		return $bytesToString($subslice(b.buf, b.off));
	};
	Buffer.prototype.String = function() { return this.$val.String(); };
	Buffer.Ptr.prototype.Len = function() {
		var b;
		b = this;
		return b.buf.length - b.off >> 0;
	};
	Buffer.prototype.Len = function() { return this.$val.Len(); };
	Buffer.Ptr.prototype.Truncate = function(n) {
		var b;
		b = this;
		b.lastRead = 0;
		if (n < 0 || n > b.Len()) {
			throw $panic(new $String("bytes.Buffer: truncation out of range"));
		} else if (n === 0) {
			b.off = 0;
		}
		b.buf = $subslice(b.buf, 0, (b.off + n >> 0));
	};
	Buffer.prototype.Truncate = function(n) { return this.$val.Truncate(n); };
	Buffer.Ptr.prototype.Reset = function() {
		var b;
		b = this;
		b.Truncate(0);
	};
	Buffer.prototype.Reset = function() { return this.$val.Reset(); };
	Buffer.Ptr.prototype.grow = function(n) {
		var b, m, buf, _q, x;
		b = this;
		m = b.Len();
		if ((m === 0) && !((b.off === 0))) {
			b.Truncate(0);
		}
		if ((b.buf.length + n >> 0) > b.buf.capacity) {
			buf = ($sliceType($Uint8)).nil;
			if (b.buf === ($sliceType($Uint8)).nil && n <= 64) {
				buf = $subslice(new ($sliceType($Uint8))(b.bootstrap), 0);
			} else if ((m + n >> 0) <= (_q = b.buf.capacity / 2, (_q === _q && _q !== 1/0 && _q !== -1/0) ? _q >> 0 : $throwRuntimeError("integer divide by zero"))) {
				$copySlice(b.buf, $subslice(b.buf, b.off));
				buf = $subslice(b.buf, 0, m);
			} else {
				buf = makeSlice((x = b.buf.capacity, (((2 >>> 16 << 16) * x >> 0) + (2 << 16 >>> 16) * x) >> 0) + n >> 0);
				$copySlice(buf, $subslice(b.buf, b.off));
			}
			b.buf = buf;
			b.off = 0;
		}
		b.buf = $subslice(b.buf, 0, ((b.off + m >> 0) + n >> 0));
		return b.off + m >> 0;
	};
	Buffer.prototype.grow = function(n) { return this.$val.grow(n); };
	Buffer.Ptr.prototype.Grow = function(n) {
		var b, m;
		b = this;
		if (n < 0) {
			throw $panic(new $String("bytes.Buffer.Grow: negative count"));
		}
		m = b.grow(n);
		b.buf = $subslice(b.buf, 0, m);
	};
	Buffer.prototype.Grow = function(n) { return this.$val.Grow(n); };
	Buffer.Ptr.prototype.Write = function(p) {
		var n, err, b, m, _tmp, _tmp$1;
		n = 0;
		err = null;
		b = this;
		b.lastRead = 0;
		m = b.grow(p.length);
		_tmp = $copySlice($subslice(b.buf, m), p); _tmp$1 = null; n = _tmp; err = _tmp$1;
		return [n, err];
	};
	Buffer.prototype.Write = function(p) { return this.$val.Write(p); };
	Buffer.Ptr.prototype.WriteString = function(s) {
		var n, err, b, m, _tmp, _tmp$1;
		n = 0;
		err = null;
		b = this;
		b.lastRead = 0;
		m = b.grow(s.length);
		_tmp = $copyString($subslice(b.buf, m), s); _tmp$1 = null; n = _tmp; err = _tmp$1;
		return [n, err];
	};
	Buffer.prototype.WriteString = function(s) { return this.$val.WriteString(s); };
	Buffer.Ptr.prototype.ReadFrom = function(r) {
		var n, err, b, free, newBuf, x, _tuple, m, e, x$1, _tmp, _tmp$1, _tmp$2, _tmp$3;
		n = new $Int64(0, 0);
		err = null;
		b = this;
		b.lastRead = 0;
		if (b.off >= b.buf.length) {
			b.Truncate(0);
		}
		while (true) {
			free = b.buf.capacity - b.buf.length >> 0;
			if (free < 512) {
				newBuf = b.buf;
				if ((b.off + free >> 0) < 512) {
					newBuf = makeSlice((x = b.buf.capacity, (((2 >>> 16 << 16) * x >> 0) + (2 << 16 >>> 16) * x) >> 0) + 512 >> 0);
				}
				$copySlice(newBuf, $subslice(b.buf, b.off));
				b.buf = $subslice(newBuf, 0, (b.buf.length - b.off >> 0));
				b.off = 0;
			}
			_tuple = r.Read($subslice(b.buf, b.buf.length, b.buf.capacity)); m = _tuple[0]; e = _tuple[1];
			b.buf = $subslice(b.buf, 0, (b.buf.length + m >> 0));
			n = (x$1 = new $Int64(0, m), new $Int64(n.high + x$1.high, n.low + x$1.low));
			if ($interfaceIsEqual(e, io.EOF)) {
				break;
			}
			if (!($interfaceIsEqual(e, null))) {
				_tmp = n; _tmp$1 = e; n = _tmp; err = _tmp$1;
				return [n, err];
			}
		}
		_tmp$2 = n; _tmp$3 = null; n = _tmp$2; err = _tmp$3;
		return [n, err];
	};
	Buffer.prototype.ReadFrom = function(r) { return this.$val.ReadFrom(r); };
	makeSlice = function(n) {
		var $deferred = [];
		try {
			$deferred.push({ fun: (function() {
				if (!($interfaceIsEqual($recover(), null))) {
					throw $panic($pkg.ErrTooLarge);
				}
			}), args: [] });
			return ($sliceType($Uint8)).make(n, 0, function() { return 0; });
		} catch($err) {
			$pushErr($err);
			return ($sliceType($Uint8)).nil;
		} finally {
			$callDeferred($deferred);
		}
	};
	Buffer.Ptr.prototype.WriteTo = function(w) {
		var n, err, b, nBytes, _tuple, m, e, _tmp, _tmp$1, _tmp$2, _tmp$3;
		n = new $Int64(0, 0);
		err = null;
		b = this;
		b.lastRead = 0;
		if (b.off < b.buf.length) {
			nBytes = b.Len();
			_tuple = w.Write($subslice(b.buf, b.off)); m = _tuple[0]; e = _tuple[1];
			if (m > nBytes) {
				throw $panic(new $String("bytes.Buffer.WriteTo: invalid Write count"));
			}
			b.off = b.off + (m) >> 0;
			n = new $Int64(0, m);
			if (!($interfaceIsEqual(e, null))) {
				_tmp = n; _tmp$1 = e; n = _tmp; err = _tmp$1;
				return [n, err];
			}
			if (!((m === nBytes))) {
				_tmp$2 = n; _tmp$3 = io.ErrShortWrite; n = _tmp$2; err = _tmp$3;
				return [n, err];
			}
		}
		b.Truncate(0);
		return [n, err];
	};
	Buffer.prototype.WriteTo = function(w) { return this.$val.WriteTo(w); };
	Buffer.Ptr.prototype.WriteByte = function(c) {
		var b, m, x;
		b = this;
		b.lastRead = 0;
		m = b.grow(1);
		(x = b.buf, (m < 0 || m >= x.length) ? $throwRuntimeError("index out of range") : x.array[x.offset + m] = c);
		return null;
	};
	Buffer.prototype.WriteByte = function(c) { return this.$val.WriteByte(c); };
	Buffer.Ptr.prototype.WriteRune = function(r) {
		var n, err, b, _tmp, _tmp$1, _tmp$2, _tmp$3;
		n = 0;
		err = null;
		b = this;
		if (r < 128) {
			b.WriteByte((r << 24 >>> 24));
			_tmp = 1; _tmp$1 = null; n = _tmp; err = _tmp$1;
			return [n, err];
		}
		n = utf8.EncodeRune($subslice(new ($sliceType($Uint8))(b.runeBytes), 0), r);
		b.Write($subslice(new ($sliceType($Uint8))(b.runeBytes), 0, n));
		_tmp$2 = n; _tmp$3 = null; n = _tmp$2; err = _tmp$3;
		return [n, err];
	};
	Buffer.prototype.WriteRune = function(r) { return this.$val.WriteRune(r); };
	Buffer.Ptr.prototype.Read = function(p) {
		var n, err, b, _tmp, _tmp$1;
		n = 0;
		err = null;
		b = this;
		b.lastRead = 0;
		if (b.off >= b.buf.length) {
			b.Truncate(0);
			if (p.length === 0) {
				return [n, err];
			}
			_tmp = 0; _tmp$1 = io.EOF; n = _tmp; err = _tmp$1;
			return [n, err];
		}
		n = $copySlice(p, $subslice(b.buf, b.off));
		b.off = b.off + (n) >> 0;
		if (n > 0) {
			b.lastRead = 2;
		}
		return [n, err];
	};
	Buffer.prototype.Read = function(p) { return this.$val.Read(p); };
	Buffer.Ptr.prototype.Next = function(n) {
		var b, m, data;
		b = this;
		b.lastRead = 0;
		m = b.Len();
		if (n > m) {
			n = m;
		}
		data = $subslice(b.buf, b.off, (b.off + n >> 0));
		b.off = b.off + (n) >> 0;
		if (n > 0) {
			b.lastRead = 2;
		}
		return data;
	};
	Buffer.prototype.Next = function(n) { return this.$val.Next(n); };
	Buffer.Ptr.prototype.ReadByte = function() {
		var c, err, b, _tmp, _tmp$1, x, x$1, _tmp$2, _tmp$3;
		c = 0;
		err = null;
		b = this;
		b.lastRead = 0;
		if (b.off >= b.buf.length) {
			b.Truncate(0);
			_tmp = 0; _tmp$1 = io.EOF; c = _tmp; err = _tmp$1;
			return [c, err];
		}
		c = (x = b.buf, x$1 = b.off, ((x$1 < 0 || x$1 >= x.length) ? $throwRuntimeError("index out of range") : x.array[x.offset + x$1]));
		b.off = b.off + 1 >> 0;
		b.lastRead = 2;
		_tmp$2 = c; _tmp$3 = null; c = _tmp$2; err = _tmp$3;
		return [c, err];
	};
	Buffer.prototype.ReadByte = function() { return this.$val.ReadByte(); };
	Buffer.Ptr.prototype.ReadRune = function() {
		var r, size, err, b, _tmp, _tmp$1, _tmp$2, x, x$1, c, _tmp$3, _tmp$4, _tmp$5, _tuple, n, _tmp$6, _tmp$7, _tmp$8;
		r = 0;
		size = 0;
		err = null;
		b = this;
		b.lastRead = 0;
		if (b.off >= b.buf.length) {
			b.Truncate(0);
			_tmp = 0; _tmp$1 = 0; _tmp$2 = io.EOF; r = _tmp; size = _tmp$1; err = _tmp$2;
			return [r, size, err];
		}
		b.lastRead = 1;
		c = (x = b.buf, x$1 = b.off, ((x$1 < 0 || x$1 >= x.length) ? $throwRuntimeError("index out of range") : x.array[x.offset + x$1]));
		if (c < 128) {
			b.off = b.off + 1 >> 0;
			_tmp$3 = (c >> 0); _tmp$4 = 1; _tmp$5 = null; r = _tmp$3; size = _tmp$4; err = _tmp$5;
			return [r, size, err];
		}
		_tuple = utf8.DecodeRune($subslice(b.buf, b.off)); r = _tuple[0]; n = _tuple[1];
		b.off = b.off + (n) >> 0;
		_tmp$6 = r; _tmp$7 = n; _tmp$8 = null; r = _tmp$6; size = _tmp$7; err = _tmp$8;
		return [r, size, err];
	};
	Buffer.prototype.ReadRune = function() { return this.$val.ReadRune(); };
	Buffer.Ptr.prototype.UnreadRune = function() {
		var b, _tuple, n;
		b = this;
		if (!((b.lastRead === 1))) {
			return errors.New("bytes.Buffer: UnreadRune: previous operation was not ReadRune");
		}
		b.lastRead = 0;
		if (b.off > 0) {
			_tuple = utf8.DecodeLastRune($subslice(b.buf, 0, b.off)); n = _tuple[1];
			b.off = b.off - (n) >> 0;
		}
		return null;
	};
	Buffer.prototype.UnreadRune = function() { return this.$val.UnreadRune(); };
	Buffer.Ptr.prototype.UnreadByte = function() {
		var b;
		b = this;
		if (!((b.lastRead === 1)) && !((b.lastRead === 2))) {
			return errors.New("bytes.Buffer: UnreadByte: previous operation was not a read");
		}
		b.lastRead = 0;
		if (b.off > 0) {
			b.off = b.off - 1 >> 0;
		}
		return null;
	};
	Buffer.prototype.UnreadByte = function() { return this.$val.UnreadByte(); };
	Buffer.Ptr.prototype.ReadBytes = function(delim) {
		var line, err, b, _tuple, slice;
		line = ($sliceType($Uint8)).nil;
		err = null;
		b = this;
		_tuple = b.readSlice(delim); slice = _tuple[0]; err = _tuple[1];
		line = $appendSlice(line, slice);
		return [line, err];
	};
	Buffer.prototype.ReadBytes = function(delim) { return this.$val.ReadBytes(delim); };
	Buffer.Ptr.prototype.readSlice = function(delim) {
		var line, err, b, i, end, _tmp, _tmp$1;
		line = ($sliceType($Uint8)).nil;
		err = null;
		b = this;
		i = IndexByte($subslice(b.buf, b.off), delim);
		end = (b.off + i >> 0) + 1 >> 0;
		if (i < 0) {
			end = b.buf.length;
			err = io.EOF;
		}
		line = $subslice(b.buf, b.off, end);
		b.off = end;
		b.lastRead = 2;
		_tmp = line; _tmp$1 = err; line = _tmp; err = _tmp$1;
		return [line, err];
	};
	Buffer.prototype.readSlice = function(delim) { return this.$val.readSlice(delim); };
	Buffer.Ptr.prototype.ReadString = function(delim) {
		var line, err, b, _tuple, slice, _tmp, _tmp$1;
		line = "";
		err = null;
		b = this;
		_tuple = b.readSlice(delim); slice = _tuple[0]; err = _tuple[1];
		_tmp = $bytesToString(slice); _tmp$1 = err; line = _tmp; err = _tmp$1;
		return [line, err];
	};
	Buffer.prototype.ReadString = function(delim) { return this.$val.ReadString(delim); };
	Map = $pkg.Map = function(mapping, s) {
		var maxbytes, nbytes, b, i, wid, r, _tuple, nb;
		maxbytes = s.length;
		nbytes = 0;
		b = ($sliceType($Uint8)).make(maxbytes, 0, function() { return 0; });
		i = 0;
		while (i < s.length) {
			wid = 1;
			r = (((i < 0 || i >= s.length) ? $throwRuntimeError("index out of range") : s.array[s.offset + i]) >> 0);
			if (r >= 128) {
				_tuple = utf8.DecodeRune($subslice(s, i)); r = _tuple[0]; wid = _tuple[1];
			}
			r = mapping(r);
			if (r >= 0) {
				if ((nbytes + utf8.RuneLen(r) >> 0) > maxbytes) {
					maxbytes = ((((maxbytes >>> 16 << 16) * 2 >> 0) + (maxbytes << 16 >>> 16) * 2) >> 0) + 4 >> 0;
					nb = ($sliceType($Uint8)).make(maxbytes, 0, function() { return 0; });
					$copySlice(nb, $subslice(b, 0, nbytes));
					b = nb;
				}
				nbytes = nbytes + (utf8.EncodeRune($subslice(b, nbytes, maxbytes), r)) >> 0;
			}
			i = i + (wid) >> 0;
		}
		return $subslice(b, 0, nbytes);
	};
	$pkg.init = function() {
		($ptrType(Buffer)).methods = [["Bytes", "Bytes", "", [], [($sliceType($Uint8))], false, -1], ["Grow", "Grow", "", [$Int], [], false, -1], ["Len", "Len", "", [], [$Int], false, -1], ["Next", "Next", "", [$Int], [($sliceType($Uint8))], false, -1], ["Read", "Read", "", [($sliceType($Uint8))], [$Int, $error], false, -1], ["ReadByte", "ReadByte", "", [], [$Uint8, $error], false, -1], ["ReadBytes", "ReadBytes", "", [$Uint8], [($sliceType($Uint8)), $error], false, -1], ["ReadFrom", "ReadFrom", "", [io.Reader], [$Int64, $error], false, -1], ["ReadRune", "ReadRune", "", [], [$Int32, $Int, $error], false, -1], ["ReadString", "ReadString", "", [$Uint8], [$String, $error], false, -1], ["Reset", "Reset", "", [], [], false, -1], ["String", "String", "", [], [$String], false, -1], ["Truncate", "Truncate", "", [$Int], [], false, -1], ["UnreadByte", "UnreadByte", "", [], [$error], false, -1], ["UnreadRune", "UnreadRune", "", [], [$error], false, -1], ["Write", "Write", "", [($sliceType($Uint8))], [$Int, $error], false, -1], ["WriteByte", "WriteByte", "", [$Uint8], [$error], false, -1], ["WriteRune", "WriteRune", "", [$Int32], [$Int, $error], false, -1], ["WriteString", "WriteString", "", [$String], [$Int, $error], false, -1], ["WriteTo", "WriteTo", "", [io.Writer], [$Int64, $error], false, -1], ["grow", "grow", "bytes", [$Int], [$Int], false, -1], ["readSlice", "readSlice", "bytes", [$Uint8], [($sliceType($Uint8)), $error], false, -1]];
		Buffer.init([["buf", "buf", "bytes", ($sliceType($Uint8)), ""], ["off", "off", "bytes", $Int, ""], ["runeBytes", "runeBytes", "bytes", ($arrayType($Uint8, 4)), ""], ["bootstrap", "bootstrap", "bytes", ($arrayType($Uint8, 64)), ""], ["lastRead", "lastRead", "bytes", readOp, ""]]);
		$pkg.ErrTooLarge = errors.New("bytes.Buffer: too large");
	};
	return $pkg;
})();
$packages["encoding"] = (function() {
	var $pkg = {}, TextMarshaler, TextUnmarshaler;
	TextMarshaler = $pkg.TextMarshaler = $newType(8, "Interface", "encoding.TextMarshaler", "TextMarshaler", "encoding", null);
	TextUnmarshaler = $pkg.TextUnmarshaler = $newType(8, "Interface", "encoding.TextUnmarshaler", "TextUnmarshaler", "encoding", null);
	$pkg.init = function() {
		TextMarshaler.init([["MarshalText", "MarshalText", "", [], [($sliceType($Uint8)), $error], false]]);
		TextUnmarshaler.init([["UnmarshalText", "UnmarshalText", "", [($sliceType($Uint8))], [$error], false]]);
	};
	return $pkg;
})();
$packages["math"] = (function() {
	var $pkg = {}, js = $packages["github.com/gopherjs/gopherjs/js"], Inf, Ldexp, NaN, Float32bits, Float32frombits, Float64bits, Float64frombits, math, zero, posInf, negInf, nan, pow10tab;
	Inf = $pkg.Inf = function(sign) {
		if (sign >= 0) {
			return posInf;
		} else {
			return negInf;
		}
	};
	Ldexp = $pkg.Ldexp = function(frac, exp$1) {
		if (frac === 0) {
			return frac;
		}
		if (exp$1 >= 1024) {
			return frac * $parseFloat(math.pow(2, 1023)) * $parseFloat(math.pow(2, exp$1 - 1023 >> 0));
		}
		if (exp$1 <= -1024) {
			return frac * $parseFloat(math.pow(2, -1023)) * $parseFloat(math.pow(2, exp$1 + 1023 >> 0));
		}
		return frac * $parseFloat(math.pow(2, exp$1));
	};
	NaN = $pkg.NaN = function() {
		return nan;
	};
	Float32bits = $pkg.Float32bits = function(f) {
		var s, e, r;
		if ($float32IsEqual(f, 0)) {
			if ($float32IsEqual(1 / f, negInf)) {
				return 2147483648;
			}
			return 0;
		}
		if (!(($float32IsEqual(f, f)))) {
			return 2143289344;
		}
		s = 0;
		if (f < 0) {
			s = 2147483648;
			f = -f;
		}
		e = 150;
		while (f >= 1.6777216e+07) {
			f = f / 2;
			if (e === 255) {
				break;
			}
			e = e + 1 >>> 0;
		}
		while (f < 8.388608e+06) {
			e = e - 1 >>> 0;
			if (e === 0) {
				break;
			}
			f = f * 2;
		}
		r = $parseFloat($mod(f, 2));
		if ((r > 0.5 && r < 1) || r >= 1.5) {
			f = f + 1;
		}
		return (((s | (e << 23 >>> 0)) >>> 0) | (((f >> 0) & ~8388608))) >>> 0;
	};
	Float32frombits = $pkg.Float32frombits = function(b) {
		var s, e, m;
		s = 1;
		if (!((((b & 2147483648) >>> 0) === 0))) {
			s = -1;
		}
		e = (((b >>> 23 >>> 0)) & 255) >>> 0;
		m = (b & 8388607) >>> 0;
		if (e === 255) {
			if (m === 0) {
				return s / 0;
			}
			return nan;
		}
		if (!((e === 0))) {
			m = m + 8388608 >>> 0;
		}
		if (e === 0) {
			e = 1;
		}
		return Ldexp(m, ((e >> 0) - 127 >> 0) - 23 >> 0) * s;
	};
	Float64bits = $pkg.Float64bits = function(f) {
		var s, e, x, x$1, x$2, x$3;
		if (f === 0) {
			if (1 / f === negInf) {
				return new $Uint64(2147483648, 0);
			}
			return new $Uint64(0, 0);
		}
		if (!((f === f))) {
			return new $Uint64(2146959360, 1);
		}
		s = new $Uint64(0, 0);
		if (f < 0) {
			s = new $Uint64(2147483648, 0);
			f = -f;
		}
		e = 1075;
		while (f >= 9.007199254740992e+15) {
			f = f / 2;
			if (e === 2047) {
				break;
			}
			e = e + 1 >>> 0;
		}
		while (f < 4.503599627370496e+15) {
			e = e - 1 >>> 0;
			if (e === 0) {
				break;
			}
			f = f * 2;
		}
		return (x = (x$1 = $shiftLeft64(new $Uint64(0, e), 52), new $Uint64(s.high | x$1.high, (s.low | x$1.low) >>> 0)), x$2 = (x$3 = new $Uint64(0, f), new $Uint64(x$3.high &~ 1048576, (x$3.low &~ 0) >>> 0)), new $Uint64(x.high | x$2.high, (x.low | x$2.low) >>> 0));
	};
	Float64frombits = $pkg.Float64frombits = function(b) {
		var s, x, x$1, e, m;
		s = 1;
		if (!((x = new $Uint64(b.high & 2147483648, (b.low & 0) >>> 0), (x.high === 0 && x.low === 0)))) {
			s = -1;
		}
		e = (x$1 = $shiftRightUint64(b, 52), new $Uint64(x$1.high & 0, (x$1.low & 2047) >>> 0));
		m = new $Uint64(b.high & 1048575, (b.low & 4294967295) >>> 0);
		if ((e.high === 0 && e.low === 2047)) {
			if ((m.high === 0 && m.low === 0)) {
				return s / 0;
			}
			return nan;
		}
		if (!((e.high === 0 && e.low === 0))) {
			m = new $Uint64(m.high + 1048576, m.low + 0);
		}
		if ((e.high === 0 && e.low === 0)) {
			e = new $Uint64(0, 1);
		}
		return Ldexp($flatten64(m), ((e.low >> 0) - 1023 >> 0) - 52 >> 0) * s;
	};
	$pkg.init = function() {
		pow10tab = $makeNativeArray("Float64", 70, function() { return 0; });
		math = $global.Math;
		zero = 0;
		posInf = 1 / zero;
		negInf = -1 / zero;
		nan = 0 / zero;
		var i, _q, m;
		Float32bits(0);
		Float32frombits(0);
		pow10tab[0] = 1;
		pow10tab[1] = 10;
		i = 2;
		while (i < 70) {
			m = (_q = i / 2, (_q === _q && _q !== 1/0 && _q !== -1/0) ? _q >> 0 : $throwRuntimeError("integer divide by zero"));
			pow10tab[i] = pow10tab[m] * pow10tab[(i - m >> 0)];
			i = i + 1 >> 0;
		}
	};
	return $pkg;
})();
$packages["strconv"] = (function() {
	var $pkg = {}, math = $packages["math"], errors = $packages["errors"], utf8 = $packages["unicode/utf8"], NumError, decimal, leftCheat, extFloat, floatInfo, decimalSlice, equalIgnoreCase, special, readFloat, atof64exact, atof32exact, atof32, atof64, ParseFloat, syntaxError, rangeError, cutoff64, ParseUint, ParseInt, digitZero, trim, rightShift, prefixIsLessThan, leftShift, shouldRoundUp, frexp10Many, adjustLastDigitFixed, adjustLastDigit, AppendFloat, genericFtoa, bigFtoa, formatDigits, roundShortest, fmtE, fmtF, fmtB, max, FormatInt, Itoa, formatBits, quoteWith, Quote, QuoteToASCII, QuoteRune, AppendQuoteRune, QuoteRuneToASCII, AppendQuoteRuneToASCII, CanBackquote, unhex, UnquoteChar, Unquote, contains, bsearch16, bsearch32, IsPrint, optimize, powtab, float64pow10, float32pow10, leftcheats, smallPowersOfTen, powersOfTen, uint64pow10, float32info, float64info, isPrint16, isNotPrint16, isPrint32, isNotPrint32, shifts;
	NumError = $pkg.NumError = $newType(0, "Struct", "strconv.NumError", "NumError", "strconv", function(Func_, Num_, Err_) {
		this.$val = this;
		this.Func = Func_ !== undefined ? Func_ : "";
		this.Num = Num_ !== undefined ? Num_ : "";
		this.Err = Err_ !== undefined ? Err_ : null;
	});
	decimal = $pkg.decimal = $newType(0, "Struct", "strconv.decimal", "decimal", "strconv", function(d_, nd_, dp_, neg_, trunc_) {
		this.$val = this;
		this.d = d_ !== undefined ? d_ : $makeNativeArray("Uint8", 800, function() { return 0; });
		this.nd = nd_ !== undefined ? nd_ : 0;
		this.dp = dp_ !== undefined ? dp_ : 0;
		this.neg = neg_ !== undefined ? neg_ : false;
		this.trunc = trunc_ !== undefined ? trunc_ : false;
	});
	leftCheat = $pkg.leftCheat = $newType(0, "Struct", "strconv.leftCheat", "leftCheat", "strconv", function(delta_, cutoff_) {
		this.$val = this;
		this.delta = delta_ !== undefined ? delta_ : 0;
		this.cutoff = cutoff_ !== undefined ? cutoff_ : "";
	});
	extFloat = $pkg.extFloat = $newType(0, "Struct", "strconv.extFloat", "extFloat", "strconv", function(mant_, exp_, neg_) {
		this.$val = this;
		this.mant = mant_ !== undefined ? mant_ : new $Uint64(0, 0);
		this.exp = exp_ !== undefined ? exp_ : 0;
		this.neg = neg_ !== undefined ? neg_ : false;
	});
	floatInfo = $pkg.floatInfo = $newType(0, "Struct", "strconv.floatInfo", "floatInfo", "strconv", function(mantbits_, expbits_, bias_) {
		this.$val = this;
		this.mantbits = mantbits_ !== undefined ? mantbits_ : 0;
		this.expbits = expbits_ !== undefined ? expbits_ : 0;
		this.bias = bias_ !== undefined ? bias_ : 0;
	});
	decimalSlice = $pkg.decimalSlice = $newType(0, "Struct", "strconv.decimalSlice", "decimalSlice", "strconv", function(d_, nd_, dp_, neg_) {
		this.$val = this;
		this.d = d_ !== undefined ? d_ : ($sliceType($Uint8)).nil;
		this.nd = nd_ !== undefined ? nd_ : 0;
		this.dp = dp_ !== undefined ? dp_ : 0;
		this.neg = neg_ !== undefined ? neg_ : false;
	});
	equalIgnoreCase = function(s1, s2) {
		var i, c1, c2;
		if (!((s1.length === s2.length))) {
			return false;
		}
		i = 0;
		while (i < s1.length) {
			c1 = s1.charCodeAt(i);
			if (65 <= c1 && c1 <= 90) {
				c1 = c1 + 32 << 24 >>> 24;
			}
			c2 = s2.charCodeAt(i);
			if (65 <= c2 && c2 <= 90) {
				c2 = c2 + 32 << 24 >>> 24;
			}
			if (!((c1 === c2))) {
				return false;
			}
			i = i + 1 >> 0;
		}
		return true;
	};
	special = function(s) {
		var f, ok, _ref, _tmp, _tmp$1, _tmp$2, _tmp$3, _tmp$4, _tmp$5, _tmp$6, _tmp$7;
		f = 0;
		ok = false;
		if (s.length === 0) {
			return [f, ok];
		}
		_ref = s.charCodeAt(0);
		if (_ref === 43) {
			if (equalIgnoreCase(s, "+inf") || equalIgnoreCase(s, "+infinity")) {
				_tmp = math.Inf(1); _tmp$1 = true; f = _tmp; ok = _tmp$1;
				return [f, ok];
			}
		} else if (_ref === 45) {
			if (equalIgnoreCase(s, "-inf") || equalIgnoreCase(s, "-infinity")) {
				_tmp$2 = math.Inf(-1); _tmp$3 = true; f = _tmp$2; ok = _tmp$3;
				return [f, ok];
			}
		} else if (_ref === 110 || _ref === 78) {
			if (equalIgnoreCase(s, "nan")) {
				_tmp$4 = math.NaN(); _tmp$5 = true; f = _tmp$4; ok = _tmp$5;
				return [f, ok];
			}
		} else if (_ref === 105 || _ref === 73) {
			if (equalIgnoreCase(s, "inf") || equalIgnoreCase(s, "infinity")) {
				_tmp$6 = math.Inf(1); _tmp$7 = true; f = _tmp$6; ok = _tmp$7;
				return [f, ok];
			}
		} else {
			return [f, ok];
		}
		return [f, ok];
	};
	decimal.Ptr.prototype.set = function(s) {
		var ok, b, i, sawdot, sawdigits, esign, e;
		ok = false;
		b = this;
		i = 0;
		b.neg = false;
		b.trunc = false;
		if (i >= s.length) {
			return ok;
		}
		if (s.charCodeAt(i) === 43) {
			i = i + 1 >> 0;
		} else if (s.charCodeAt(i) === 45) {
			b.neg = true;
			i = i + 1 >> 0;
		}
		sawdot = false;
		sawdigits = false;
		while (i < s.length) {
			if (s.charCodeAt(i) === 46) {
				if (sawdot) {
					return ok;
				}
				sawdot = true;
				b.dp = b.nd;
				i = i + 1 >> 0;
				continue;
			} else if (48 <= s.charCodeAt(i) && s.charCodeAt(i) <= 57) {
				sawdigits = true;
				if ((s.charCodeAt(i) === 48) && (b.nd === 0)) {
					b.dp = b.dp - 1 >> 0;
					i = i + 1 >> 0;
					continue;
				}
				if (b.nd < 800) {
					b.d[b.nd] = s.charCodeAt(i);
					b.nd = b.nd + 1 >> 0;
				} else if (!((s.charCodeAt(i) === 48))) {
					b.trunc = true;
				}
				i = i + 1 >> 0;
				continue;
			}
			break;
		}
		if (!sawdigits) {
			return ok;
		}
		if (!sawdot) {
			b.dp = b.nd;
		}
		if (i < s.length && ((s.charCodeAt(i) === 101) || (s.charCodeAt(i) === 69))) {
			i = i + 1 >> 0;
			if (i >= s.length) {
				return ok;
			}
			esign = 1;
			if (s.charCodeAt(i) === 43) {
				i = i + 1 >> 0;
			} else if (s.charCodeAt(i) === 45) {
				i = i + 1 >> 0;
				esign = -1;
			}
			if (i >= s.length || s.charCodeAt(i) < 48 || s.charCodeAt(i) > 57) {
				return ok;
			}
			e = 0;
			while (i < s.length && 48 <= s.charCodeAt(i) && s.charCodeAt(i) <= 57) {
				if (e < 10000) {
					e = (((((e >>> 16 << 16) * 10 >> 0) + (e << 16 >>> 16) * 10) >> 0) + (s.charCodeAt(i) >> 0) >> 0) - 48 >> 0;
				}
				i = i + 1 >> 0;
			}
			b.dp = b.dp + (((((e >>> 16 << 16) * esign >> 0) + (e << 16 >>> 16) * esign) >> 0)) >> 0;
		}
		if (!((i === s.length))) {
			return ok;
		}
		ok = true;
		return ok;
	};
	decimal.prototype.set = function(s) { return this.$val.set(s); };
	readFloat = function(s) {
		var mantissa, exp, neg, trunc, ok, i, sawdot, sawdigits, nd, ndMant, dp, c, _ref, x, esign, e;
		mantissa = new $Uint64(0, 0);
		exp = 0;
		neg = false;
		trunc = false;
		ok = false;
		i = 0;
		if (i >= s.length) {
			return [mantissa, exp, neg, trunc, ok];
		}
		if (s.charCodeAt(i) === 43) {
			i = i + 1 >> 0;
		} else if (s.charCodeAt(i) === 45) {
			neg = true;
			i = i + 1 >> 0;
		}
		sawdot = false;
		sawdigits = false;
		nd = 0;
		ndMant = 0;
		dp = 0;
		while (i < s.length) {
			c = s.charCodeAt(i);
			_ref = true;
			if (_ref === (c === 46)) {
				if (sawdot) {
					return [mantissa, exp, neg, trunc, ok];
				}
				sawdot = true;
				dp = nd;
				i = i + 1 >> 0;
				continue;
			} else if (_ref === 48 <= c && c <= 57) {
				sawdigits = true;
				if ((c === 48) && (nd === 0)) {
					dp = dp - 1 >> 0;
					i = i + 1 >> 0;
					continue;
				}
				nd = nd + 1 >> 0;
				if (ndMant < 19) {
					mantissa = $mul64(mantissa, new $Uint64(0, 10));
					mantissa = (x = new $Uint64(0, (c - 48 << 24 >>> 24)), new $Uint64(mantissa.high + x.high, mantissa.low + x.low));
					ndMant = ndMant + 1 >> 0;
				} else if (!((s.charCodeAt(i) === 48))) {
					trunc = true;
				}
				i = i + 1 >> 0;
				continue;
			}
			break;
		}
		if (!sawdigits) {
			return [mantissa, exp, neg, trunc, ok];
		}
		if (!sawdot) {
			dp = nd;
		}
		if (i < s.length && ((s.charCodeAt(i) === 101) || (s.charCodeAt(i) === 69))) {
			i = i + 1 >> 0;
			if (i >= s.length) {
				return [mantissa, exp, neg, trunc, ok];
			}
			esign = 1;
			if (s.charCodeAt(i) === 43) {
				i = i + 1 >> 0;
			} else if (s.charCodeAt(i) === 45) {
				i = i + 1 >> 0;
				esign = -1;
			}
			if (i >= s.length || s.charCodeAt(i) < 48 || s.charCodeAt(i) > 57) {
				return [mantissa, exp, neg, trunc, ok];
			}
			e = 0;
			while (i < s.length && 48 <= s.charCodeAt(i) && s.charCodeAt(i) <= 57) {
				if (e < 10000) {
					e = (((((e >>> 16 << 16) * 10 >> 0) + (e << 16 >>> 16) * 10) >> 0) + (s.charCodeAt(i) >> 0) >> 0) - 48 >> 0;
				}
				i = i + 1 >> 0;
			}
			dp = dp + (((((e >>> 16 << 16) * esign >> 0) + (e << 16 >>> 16) * esign) >> 0)) >> 0;
		}
		if (!((i === s.length))) {
			return [mantissa, exp, neg, trunc, ok];
		}
		exp = dp - ndMant >> 0;
		ok = true;
		return [mantissa, exp, neg, trunc, ok];
	};
	decimal.Ptr.prototype.floatBits = function(flt) {
		var $this = this, $args = arguments, b, overflow, d, exp, mant, n, x, n$1, x$1, n$2, y, x$2, y$1, x$3, x$4, y$2, x$5, x$6, bits, x$7, y$3, x$8, _tmp, _tmp$1;
		b = new $Uint64(0, 0);
		overflow = false;
		/* */ var $s = 0, $f = function() { while (true) { switch ($s) { case 0:
		d = $this;
		exp = 0;
		mant = new $Uint64(0, 0);
		/* if (d.nd === 0) { */ if (d.nd === 0) {} else { $s = 3; continue; }
			mant = new $Uint64(0, 0);
			exp = flt.bias;
			/* goto out */ $s = 1; continue;
		/* } */ case 3:
		/* if (d.dp > 310) { */ if (d.dp > 310) {} else { $s = 4; continue; }
			/* goto overflow */ $s = 2; continue;
		/* } */ case 4:
		/* if (d.dp < -330) { */ if (d.dp < -330) {} else { $s = 5; continue; }
			mant = new $Uint64(0, 0);
			exp = flt.bias;
			/* goto out */ $s = 1; continue;
		/* } */ case 5:
		exp = 0;
		while (d.dp > 0) {
			n = 0;
			if (d.dp >= powtab.length) {
				n = 27;
			} else {
				n = (x = d.dp, ((x < 0 || x >= powtab.length) ? $throwRuntimeError("index out of range") : powtab.array[powtab.offset + x]));
			}
			d.Shift(-n);
			exp = exp + (n) >> 0;
		}
		while (d.dp < 0 || (d.dp === 0) && d.d[0] < 53) {
			n$1 = 0;
			if (-d.dp >= powtab.length) {
				n$1 = 27;
			} else {
				n$1 = (x$1 = -d.dp, ((x$1 < 0 || x$1 >= powtab.length) ? $throwRuntimeError("index out of range") : powtab.array[powtab.offset + x$1]));
			}
			d.Shift(n$1);
			exp = exp - (n$1) >> 0;
		}
		exp = exp - 1 >> 0;
		if (exp < (flt.bias + 1 >> 0)) {
			n$2 = (flt.bias + 1 >> 0) - exp >> 0;
			d.Shift(-n$2);
			exp = exp + (n$2) >> 0;
		}
		/* if ((exp - flt.bias >> 0) >= (((y = flt.expbits, y < 32 ? (1 << y) : 0) >> 0) - 1 >> 0)) { */ if ((exp - flt.bias >> 0) >= (((y = flt.expbits, y < 32 ? (1 << y) : 0) >> 0) - 1 >> 0)) {} else { $s = 6; continue; }
			/* goto overflow */ $s = 2; continue;
		/* } */ case 6:
		d.Shift(((1 + flt.mantbits >>> 0) >> 0));
		mant = d.RoundedInteger();
		/* if ((x$2 = $shiftLeft64(new $Uint64(0, 2), flt.mantbits), (mant.high === x$2.high && mant.low === x$2.low))) { */ if ((x$2 = $shiftLeft64(new $Uint64(0, 2), flt.mantbits), (mant.high === x$2.high && mant.low === x$2.low))) {} else { $s = 7; continue; }
			mant = $shiftRightUint64(mant, 1);
			exp = exp + 1 >> 0;
			/* if ((exp - flt.bias >> 0) >= (((y$1 = flt.expbits, y$1 < 32 ? (1 << y$1) : 0) >> 0) - 1 >> 0)) { */ if ((exp - flt.bias >> 0) >= (((y$1 = flt.expbits, y$1 < 32 ? (1 << y$1) : 0) >> 0) - 1 >> 0)) {} else { $s = 8; continue; }
				/* goto overflow */ $s = 2; continue;
			/* } */ case 8:
		/* } */ case 7:
		if ((x$3 = (x$4 = $shiftLeft64(new $Uint64(0, 1), flt.mantbits), new $Uint64(mant.high & x$4.high, (mant.low & x$4.low) >>> 0)), (x$3.high === 0 && x$3.low === 0))) {
			exp = flt.bias;
		}
		/* goto out */ $s = 1; continue;
		/* overflow: */ case 2:
		mant = new $Uint64(0, 0);
		exp = (((y$2 = flt.expbits, y$2 < 32 ? (1 << y$2) : 0) >> 0) - 1 >> 0) + flt.bias >> 0;
		overflow = true;
		/* out: */ case 1:
		bits = (x$5 = (x$6 = $shiftLeft64(new $Uint64(0, 1), flt.mantbits), new $Uint64(x$6.high - 0, x$6.low - 1)), new $Uint64(mant.high & x$5.high, (mant.low & x$5.low) >>> 0));
		bits = (x$7 = $shiftLeft64(new $Uint64(0, (((exp - flt.bias >> 0)) & ((((y$3 = flt.expbits, y$3 < 32 ? (1 << y$3) : 0) >> 0) - 1 >> 0)))), flt.mantbits), new $Uint64(bits.high | x$7.high, (bits.low | x$7.low) >>> 0));
		if (d.neg) {
			bits = (x$8 = $shiftLeft64($shiftLeft64(new $Uint64(0, 1), flt.mantbits), flt.expbits), new $Uint64(bits.high | x$8.high, (bits.low | x$8.low) >>> 0));
		}
		_tmp = bits; _tmp$1 = overflow; b = _tmp; overflow = _tmp$1;
		return [b, overflow];
		/* */ } break; } }; return $f();
	};
	decimal.prototype.floatBits = function(flt) { return this.$val.floatBits(flt); };
	atof64exact = function(mantissa, exp, neg) {
		var f, ok, x, _tmp, _tmp$1, x$1, _tmp$2, _tmp$3, _tmp$4, x$2, _tmp$5;
		f = 0;
		ok = false;
		if (!((x = $shiftRightUint64(mantissa, float64info.mantbits), (x.high === 0 && x.low === 0)))) {
			return [f, ok];
		}
		f = $flatten64(mantissa);
		if (neg) {
			f = -f;
		}
		if (exp === 0) {
			_tmp = f; _tmp$1 = true; f = _tmp; ok = _tmp$1;
			return [f, ok];
		} else if (exp > 0 && exp <= 37) {
			if (exp > 22) {
				f = f * ((x$1 = exp - 22 >> 0, ((x$1 < 0 || x$1 >= float64pow10.length) ? $throwRuntimeError("index out of range") : float64pow10.array[float64pow10.offset + x$1])));
				exp = 22;
			}
			if (f > 1e+15 || f < -1e+15) {
				return [f, ok];
			}
			_tmp$2 = f * ((exp < 0 || exp >= float64pow10.length) ? $throwRuntimeError("index out of range") : float64pow10.array[float64pow10.offset + exp]); _tmp$3 = true; f = _tmp$2; ok = _tmp$3;
			return [f, ok];
		} else if (exp < 0 && exp >= -22) {
			_tmp$4 = f / (x$2 = -exp, ((x$2 < 0 || x$2 >= float64pow10.length) ? $throwRuntimeError("index out of range") : float64pow10.array[float64pow10.offset + x$2])); _tmp$5 = true; f = _tmp$4; ok = _tmp$5;
			return [f, ok];
		}
		return [f, ok];
	};
	atof32exact = function(mantissa, exp, neg) {
		var f, ok, x, _tmp, _tmp$1, x$1, _tmp$2, _tmp$3, _tmp$4, x$2, _tmp$5;
		f = 0;
		ok = false;
		if (!((x = $shiftRightUint64(mantissa, float32info.mantbits), (x.high === 0 && x.low === 0)))) {
			return [f, ok];
		}
		f = $flatten64(mantissa);
		if (neg) {
			f = -f;
		}
		if (exp === 0) {
			_tmp = f; _tmp$1 = true; f = _tmp; ok = _tmp$1;
			return [f, ok];
		} else if (exp > 0 && exp <= 17) {
			if (exp > 10) {
				f = f * ((x$1 = exp - 10 >> 0, ((x$1 < 0 || x$1 >= float32pow10.length) ? $throwRuntimeError("index out of range") : float32pow10.array[float32pow10.offset + x$1])));
				exp = 10;
			}
			if (f > 1e+07 || f < -1e+07) {
				return [f, ok];
			}
			_tmp$2 = f * ((exp < 0 || exp >= float32pow10.length) ? $throwRuntimeError("index out of range") : float32pow10.array[float32pow10.offset + exp]); _tmp$3 = true; f = _tmp$2; ok = _tmp$3;
			return [f, ok];
		} else if (exp < 0 && exp >= -10) {
			_tmp$4 = f / (x$2 = -exp, ((x$2 < 0 || x$2 >= float32pow10.length) ? $throwRuntimeError("index out of range") : float32pow10.array[float32pow10.offset + x$2])); _tmp$5 = true; f = _tmp$4; ok = _tmp$5;
			return [f, ok];
		}
		return [f, ok];
	};
	atof32 = function(s) {
		var f, err, _tuple, val, ok, _tmp, _tmp$1, _tuple$1, mantissa, exp, neg, trunc, ok$1, _tuple$2, f$1, ok$2, _tmp$2, _tmp$3, ext, ok$3, _tuple$3, b, ovf, _tmp$4, _tmp$5, d, _tmp$6, _tmp$7, _tuple$4, b$1, ovf$1, _tmp$8, _tmp$9;
		f = 0;
		err = null;
		_tuple = special(s); val = _tuple[0]; ok = _tuple[1];
		if (ok) {
			_tmp = val; _tmp$1 = null; f = _tmp; err = _tmp$1;
			return [f, err];
		}
		if (optimize) {
			_tuple$1 = readFloat(s); mantissa = _tuple$1[0]; exp = _tuple$1[1]; neg = _tuple$1[2]; trunc = _tuple$1[3]; ok$1 = _tuple$1[4];
			if (ok$1) {
				if (!trunc) {
					_tuple$2 = atof32exact(mantissa, exp, neg); f$1 = _tuple$2[0]; ok$2 = _tuple$2[1];
					if (ok$2) {
						_tmp$2 = f$1; _tmp$3 = null; f = _tmp$2; err = _tmp$3;
						return [f, err];
					}
				}
				ext = new extFloat.Ptr();
				ok$3 = ext.AssignDecimal(mantissa, exp, neg, trunc, float32info);
				if (ok$3) {
					_tuple$3 = ext.floatBits(float32info); b = _tuple$3[0]; ovf = _tuple$3[1];
					f = math.Float32frombits((b.low >>> 0));
					if (ovf) {
						err = rangeError("ParseFloat", s);
					}
					_tmp$4 = f; _tmp$5 = err; f = _tmp$4; err = _tmp$5;
					return [f, err];
				}
			}
		}
		d = new decimal.Ptr();
		if (!d.set(s)) {
			_tmp$6 = 0; _tmp$7 = syntaxError("ParseFloat", s); f = _tmp$6; err = _tmp$7;
			return [f, err];
		}
		_tuple$4 = d.floatBits(float32info); b$1 = _tuple$4[0]; ovf$1 = _tuple$4[1];
		f = math.Float32frombits((b$1.low >>> 0));
		if (ovf$1) {
			err = rangeError("ParseFloat", s);
		}
		_tmp$8 = f; _tmp$9 = err; f = _tmp$8; err = _tmp$9;
		return [f, err];
	};
	atof64 = function(s) {
		var f, err, _tuple, val, ok, _tmp, _tmp$1, _tuple$1, mantissa, exp, neg, trunc, ok$1, _tuple$2, f$1, ok$2, _tmp$2, _tmp$3, ext, ok$3, _tuple$3, b, ovf, _tmp$4, _tmp$5, d, _tmp$6, _tmp$7, _tuple$4, b$1, ovf$1, _tmp$8, _tmp$9;
		f = 0;
		err = null;
		_tuple = special(s); val = _tuple[0]; ok = _tuple[1];
		if (ok) {
			_tmp = val; _tmp$1 = null; f = _tmp; err = _tmp$1;
			return [f, err];
		}
		if (optimize) {
			_tuple$1 = readFloat(s); mantissa = _tuple$1[0]; exp = _tuple$1[1]; neg = _tuple$1[2]; trunc = _tuple$1[3]; ok$1 = _tuple$1[4];
			if (ok$1) {
				if (!trunc) {
					_tuple$2 = atof64exact(mantissa, exp, neg); f$1 = _tuple$2[0]; ok$2 = _tuple$2[1];
					if (ok$2) {
						_tmp$2 = f$1; _tmp$3 = null; f = _tmp$2; err = _tmp$3;
						return [f, err];
					}
				}
				ext = new extFloat.Ptr();
				ok$3 = ext.AssignDecimal(mantissa, exp, neg, trunc, float64info);
				if (ok$3) {
					_tuple$3 = ext.floatBits(float64info); b = _tuple$3[0]; ovf = _tuple$3[1];
					f = math.Float64frombits(b);
					if (ovf) {
						err = rangeError("ParseFloat", s);
					}
					_tmp$4 = f; _tmp$5 = err; f = _tmp$4; err = _tmp$5;
					return [f, err];
				}
			}
		}
		d = new decimal.Ptr();
		if (!d.set(s)) {
			_tmp$6 = 0; _tmp$7 = syntaxError("ParseFloat", s); f = _tmp$6; err = _tmp$7;
			return [f, err];
		}
		_tuple$4 = d.floatBits(float64info); b$1 = _tuple$4[0]; ovf$1 = _tuple$4[1];
		f = math.Float64frombits(b$1);
		if (ovf$1) {
			err = rangeError("ParseFloat", s);
		}
		_tmp$8 = f; _tmp$9 = err; f = _tmp$8; err = _tmp$9;
		return [f, err];
	};
	ParseFloat = $pkg.ParseFloat = function(s, bitSize) {
		var f, err, _tuple, f1, err1, _tmp, _tmp$1, _tuple$1, f1$1, err1$1, _tmp$2, _tmp$3;
		f = 0;
		err = null;
		if (bitSize === 32) {
			_tuple = atof32(s); f1 = _tuple[0]; err1 = _tuple[1];
			_tmp = $coerceFloat32(f1); _tmp$1 = err1; f = _tmp; err = _tmp$1;
			return [f, err];
		}
		_tuple$1 = atof64(s); f1$1 = _tuple$1[0]; err1$1 = _tuple$1[1];
		_tmp$2 = f1$1; _tmp$3 = err1$1; f = _tmp$2; err = _tmp$3;
		return [f, err];
	};
	NumError.Ptr.prototype.Error = function() {
		var e;
		e = this;
		return "strconv." + e.Func + ": " + "parsing " + Quote(e.Num) + ": " + e.Err.Error();
	};
	NumError.prototype.Error = function() { return this.$val.Error(); };
	syntaxError = function(fn, str) {
		return new NumError.Ptr(fn, str, $pkg.ErrSyntax);
	};
	rangeError = function(fn, str) {
		return new NumError.Ptr(fn, str, $pkg.ErrRange);
	};
	cutoff64 = function(base) {
		var x;
		if (base < 2) {
			return new $Uint64(0, 0);
		}
		return (x = $div64(new $Uint64(4294967295, 4294967295), new $Uint64(0, base), false), new $Uint64(x.high + 0, x.low + 1));
	};
	ParseUint = $pkg.ParseUint = function(s, base, bitSize) {
		var $this = this, $args = arguments, n, err, _tmp, _tmp$1, cutoff, maxVal, s0, x, i, v, d, x$1, n1, _tmp$2, _tmp$3, _tmp$4, _tmp$5;
		n = new $Uint64(0, 0);
		err = null;
		/* */ var $s = 0, $f = function() { while (true) { switch ($s) { case 0:
		_tmp = new $Uint64(0, 0); _tmp$1 = new $Uint64(0, 0); cutoff = _tmp; maxVal = _tmp$1;
		if (bitSize === 0) {
			bitSize = 32;
		}
		s0 = s;
		/* if (s.length < 1) { */ if (s.length < 1) {} else if (2 <= base && base <= 36) { $s = 2; continue; } else if (base === 0) { $s = 3; continue; } else { $s = 4; continue; }
			err = $pkg.ErrSyntax;
			/* goto Error */ $s = 1; continue;
		/* } else if (2 <= base && base <= 36) { */ $s = 5; continue; case 2: 
		/* } else if (base === 0) { */ $s = 5; continue; case 3: 
			/* if ((s.charCodeAt(0) === 48) && s.length > 1 && ((s.charCodeAt(1) === 120) || (s.charCodeAt(1) === 88))) { */ if ((s.charCodeAt(0) === 48) && s.length > 1 && ((s.charCodeAt(1) === 120) || (s.charCodeAt(1) === 88))) {} else if (s.charCodeAt(0) === 48) { $s = 6; continue; } else { $s = 7; continue; }
				base = 16;
				s = s.substring(2);
				/* if (s.length < 1) { */ if (s.length < 1) {} else { $s = 9; continue; }
					err = $pkg.ErrSyntax;
					/* goto Error */ $s = 1; continue;
				/* } */ case 9:
			/* } else if (s.charCodeAt(0) === 48) { */ $s = 8; continue; case 6: 
				base = 8;
			/* } else { */ $s = 8; continue; case 7: 
				base = 10;
			/* } */ case 8:
		/* } else { */ $s = 5; continue; case 4: 
			err = errors.New("invalid base " + Itoa(base));
			/* goto Error */ $s = 1; continue;
		/* } */ case 5:
		n = new $Uint64(0, 0);
		cutoff = cutoff64(base);
		maxVal = (x = $shiftLeft64(new $Uint64(0, 1), (bitSize >>> 0)), new $Uint64(x.high - 0, x.low - 1));
		i = 0;
		/* while (i < s.length) { */ case 10: if(!(i < s.length)) { $s = 11; continue; }
			v = 0;
			d = s.charCodeAt(i);
			/* if (48 <= d && d <= 57) { */ if (48 <= d && d <= 57) {} else if (97 <= d && d <= 122) { $s = 12; continue; } else if (65 <= d && d <= 90) { $s = 13; continue; } else { $s = 14; continue; }
				v = d - 48 << 24 >>> 24;
			/* } else if (97 <= d && d <= 122) { */ $s = 15; continue; case 12: 
				v = (d - 97 << 24 >>> 24) + 10 << 24 >>> 24;
			/* } else if (65 <= d && d <= 90) { */ $s = 15; continue; case 13: 
				v = (d - 65 << 24 >>> 24) + 10 << 24 >>> 24;
			/* } else { */ $s = 15; continue; case 14: 
				n = new $Uint64(0, 0);
				err = $pkg.ErrSyntax;
				/* goto Error */ $s = 1; continue;
			/* } */ case 15:
			/* if ((v >> 0) >= base) { */ if ((v >> 0) >= base) {} else { $s = 16; continue; }
				n = new $Uint64(0, 0);
				err = $pkg.ErrSyntax;
				/* goto Error */ $s = 1; continue;
			/* } */ case 16:
			/* if ((n.high > cutoff.high || (n.high === cutoff.high && n.low >= cutoff.low))) { */ if ((n.high > cutoff.high || (n.high === cutoff.high && n.low >= cutoff.low))) {} else { $s = 17; continue; }
				n = new $Uint64(4294967295, 4294967295);
				err = $pkg.ErrRange;
				/* goto Error */ $s = 1; continue;
			/* } */ case 17:
			n = $mul64(n, (new $Uint64(0, base)));
			n1 = (x$1 = new $Uint64(0, v), new $Uint64(n.high + x$1.high, n.low + x$1.low));
			/* if ((n1.high < n.high || (n1.high === n.high && n1.low < n.low)) || (n1.high > maxVal.high || (n1.high === maxVal.high && n1.low > maxVal.low))) { */ if ((n1.high < n.high || (n1.high === n.high && n1.low < n.low)) || (n1.high > maxVal.high || (n1.high === maxVal.high && n1.low > maxVal.low))) {} else { $s = 18; continue; }
				n = new $Uint64(4294967295, 4294967295);
				err = $pkg.ErrRange;
				/* goto Error */ $s = 1; continue;
			/* } */ case 18:
			n = n1;
			i = i + 1 >> 0;
		/* } */ $s = 10; continue; case 11:
		_tmp$2 = n; _tmp$3 = null; n = _tmp$2; err = _tmp$3;
		return [n, err];
		/* Error: */ case 1:
		_tmp$4 = n; _tmp$5 = new NumError.Ptr("ParseUint", s0, err); n = _tmp$4; err = _tmp$5;
		return [n, err];
		/* */ } break; } }; return $f();
	};
	ParseInt = $pkg.ParseInt = function(s, base, bitSize) {
		var i, err, _tmp, _tmp$1, s0, neg, un, _tuple, _tmp$2, _tmp$3, cutoff, _tmp$4, x, _tmp$5, _tmp$6, x$1, _tmp$7, n, _tmp$8, _tmp$9;
		i = new $Int64(0, 0);
		err = null;
		if (bitSize === 0) {
			bitSize = 32;
		}
		if (s.length === 0) {
			_tmp = new $Int64(0, 0); _tmp$1 = syntaxError("ParseInt", s); i = _tmp; err = _tmp$1;
			return [i, err];
		}
		s0 = s;
		neg = false;
		if (s.charCodeAt(0) === 43) {
			s = s.substring(1);
		} else if (s.charCodeAt(0) === 45) {
			neg = true;
			s = s.substring(1);
		}
		un = new $Uint64(0, 0);
		_tuple = ParseUint(s, base, bitSize); un = _tuple[0]; err = _tuple[1];
		if (!($interfaceIsEqual(err, null)) && !($interfaceIsEqual((err !== null && err.constructor === ($ptrType(NumError)) ? err.$val : $typeAssertionFailed(err, ($ptrType(NumError)))).Err, $pkg.ErrRange))) {
			(err !== null && err.constructor === ($ptrType(NumError)) ? err.$val : $typeAssertionFailed(err, ($ptrType(NumError)))).Func = "ParseInt";
			(err !== null && err.constructor === ($ptrType(NumError)) ? err.$val : $typeAssertionFailed(err, ($ptrType(NumError)))).Num = s0;
			_tmp$2 = new $Int64(0, 0); _tmp$3 = err; i = _tmp$2; err = _tmp$3;
			return [i, err];
		}
		cutoff = $shiftLeft64(new $Uint64(0, 1), ((bitSize - 1 >> 0) >>> 0));
		if (!neg && (un.high > cutoff.high || (un.high === cutoff.high && un.low >= cutoff.low))) {
			_tmp$4 = (x = new $Uint64(cutoff.high - 0, cutoff.low - 1), new $Int64(x.high, x.low)); _tmp$5 = rangeError("ParseInt", s0); i = _tmp$4; err = _tmp$5;
			return [i, err];
		}
		if (neg && (un.high > cutoff.high || (un.high === cutoff.high && un.low > cutoff.low))) {
			_tmp$6 = (x$1 = new $Int64(cutoff.high, cutoff.low), new $Int64(-x$1.high, -x$1.low)); _tmp$7 = rangeError("ParseInt", s0); i = _tmp$6; err = _tmp$7;
			return [i, err];
		}
		n = new $Int64(un.high, un.low);
		if (neg) {
			n = new $Int64(-n.high, -n.low);
		}
		_tmp$8 = n; _tmp$9 = null; i = _tmp$8; err = _tmp$9;
		return [i, err];
	};
	decimal.Ptr.prototype.String = function() {
		var a, n, buf, w;
		a = this;
		n = 10 + a.nd >> 0;
		if (a.dp > 0) {
			n = n + (a.dp) >> 0;
		}
		if (a.dp < 0) {
			n = n + (-a.dp) >> 0;
		}
		buf = ($sliceType($Uint8)).make(n, 0, function() { return 0; });
		w = 0;
		if (a.nd === 0) {
			return "0";
		} else if (a.dp <= 0) {
			(w < 0 || w >= buf.length) ? $throwRuntimeError("index out of range") : buf.array[buf.offset + w] = 48;
			w = w + 1 >> 0;
			(w < 0 || w >= buf.length) ? $throwRuntimeError("index out of range") : buf.array[buf.offset + w] = 46;
			w = w + 1 >> 0;
			w = w + (digitZero($subslice(buf, w, (w + -a.dp >> 0)))) >> 0;
			w = w + ($copySlice($subslice(buf, w), $subslice(new ($sliceType($Uint8))(a.d), 0, a.nd))) >> 0;
		} else if (a.dp < a.nd) {
			w = w + ($copySlice($subslice(buf, w), $subslice(new ($sliceType($Uint8))(a.d), 0, a.dp))) >> 0;
			(w < 0 || w >= buf.length) ? $throwRuntimeError("index out of range") : buf.array[buf.offset + w] = 46;
			w = w + 1 >> 0;
			w = w + ($copySlice($subslice(buf, w), $subslice(new ($sliceType($Uint8))(a.d), a.dp, a.nd))) >> 0;
		} else {
			w = w + ($copySlice($subslice(buf, w), $subslice(new ($sliceType($Uint8))(a.d), 0, a.nd))) >> 0;
			w = w + (digitZero($subslice(buf, w, ((w + a.dp >> 0) - a.nd >> 0)))) >> 0;
		}
		return $bytesToString($subslice(buf, 0, w));
	};
	decimal.prototype.String = function() { return this.$val.String(); };
	digitZero = function(dst) {
		var _ref, _i, i;
		_ref = dst;
		_i = 0;
		while (_i < _ref.length) {
			i = _i;
			(i < 0 || i >= dst.length) ? $throwRuntimeError("index out of range") : dst.array[dst.offset + i] = 48;
			_i++;
		}
		return dst.length;
	};
	trim = function(a) {
		while (a.nd > 0 && (a.d[(a.nd - 1 >> 0)] === 48)) {
			a.nd = a.nd - 1 >> 0;
		}
		if (a.nd === 0) {
			a.dp = 0;
		}
	};
	decimal.Ptr.prototype.Assign = function(v) {
		var a, buf, n, v1, x;
		a = this;
		buf = $makeNativeArray("Uint8", 24, function() { return 0; });
		n = 0;
		while ((v.high > 0 || (v.high === 0 && v.low > 0))) {
			v1 = $div64(v, new $Uint64(0, 10), false);
			v = (x = $mul64(new $Uint64(0, 10), v1), new $Uint64(v.high - x.high, v.low - x.low));
			buf[n] = (new $Uint64(v.high + 0, v.low + 48).low << 24 >>> 24);
			n = n + 1 >> 0;
			v = v1;
		}
		a.nd = 0;
		n = n - 1 >> 0;
		while (n >= 0) {
			a.d[a.nd] = buf[n];
			a.nd = a.nd + 1 >> 0;
			n = n - 1 >> 0;
		}
		a.dp = a.nd;
		trim(a);
	};
	decimal.prototype.Assign = function(v) { return this.$val.Assign(v); };
	rightShift = function(a, k) {
		var r, w, n, c, c$1, dig, y, dig$1, y$1;
		r = 0;
		w = 0;
		n = 0;
		while (((n >> $min(k, 31)) >> 0) === 0) {
			if (r >= a.nd) {
				if (n === 0) {
					a.nd = 0;
					return;
				}
				while (((n >> $min(k, 31)) >> 0) === 0) {
					n = (((n >>> 16 << 16) * 10 >> 0) + (n << 16 >>> 16) * 10) >> 0;
					r = r + 1 >> 0;
				}
				break;
			}
			c = (a.d[r] >> 0);
			n = (((((n >>> 16 << 16) * 10 >> 0) + (n << 16 >>> 16) * 10) >> 0) + c >> 0) - 48 >> 0;
			r = r + 1 >> 0;
		}
		a.dp = a.dp - ((r - 1 >> 0)) >> 0;
		while (r < a.nd) {
			c$1 = (a.d[r] >> 0);
			dig = (n >> $min(k, 31)) >> 0;
			n = n - (((y = k, y < 32 ? (dig << y) : 0) >> 0)) >> 0;
			a.d[w] = ((dig + 48 >> 0) << 24 >>> 24);
			w = w + 1 >> 0;
			n = (((((n >>> 16 << 16) * 10 >> 0) + (n << 16 >>> 16) * 10) >> 0) + c$1 >> 0) - 48 >> 0;
			r = r + 1 >> 0;
		}
		while (n > 0) {
			dig$1 = (n >> $min(k, 31)) >> 0;
			n = n - (((y$1 = k, y$1 < 32 ? (dig$1 << y$1) : 0) >> 0)) >> 0;
			if (w < 800) {
				a.d[w] = ((dig$1 + 48 >> 0) << 24 >>> 24);
				w = w + 1 >> 0;
			} else if (dig$1 > 0) {
				a.trunc = true;
			}
			n = (((n >>> 16 << 16) * 10 >> 0) + (n << 16 >>> 16) * 10) >> 0;
		}
		a.nd = w;
		trim(a);
	};
	prefixIsLessThan = function(b, s) {
		var i;
		i = 0;
		while (i < s.length) {
			if (i >= b.length) {
				return true;
			}
			if (!((((i < 0 || i >= b.length) ? $throwRuntimeError("index out of range") : b.array[b.offset + i]) === s.charCodeAt(i)))) {
				return ((i < 0 || i >= b.length) ? $throwRuntimeError("index out of range") : b.array[b.offset + i]) < s.charCodeAt(i);
			}
			i = i + 1 >> 0;
		}
		return false;
	};
	leftShift = function(a, k) {
		var delta, r, w, n, y, _q, quo, rem, _q$1, quo$1, rem$1;
		delta = ((k < 0 || k >= leftcheats.length) ? $throwRuntimeError("index out of range") : leftcheats.array[leftcheats.offset + k]).delta;
		if (prefixIsLessThan($subslice(new ($sliceType($Uint8))(a.d), 0, a.nd), ((k < 0 || k >= leftcheats.length) ? $throwRuntimeError("index out of range") : leftcheats.array[leftcheats.offset + k]).cutoff)) {
			delta = delta - 1 >> 0;
		}
		r = a.nd;
		w = a.nd + delta >> 0;
		n = 0;
		r = r - 1 >> 0;
		while (r >= 0) {
			n = n + (((y = k, y < 32 ? ((((a.d[r] >> 0) - 48 >> 0)) << y) : 0) >> 0)) >> 0;
			quo = (_q = n / 10, (_q === _q && _q !== 1/0 && _q !== -1/0) ? _q >> 0 : $throwRuntimeError("integer divide by zero"));
			rem = n - ((((10 >>> 16 << 16) * quo >> 0) + (10 << 16 >>> 16) * quo) >> 0) >> 0;
			w = w - 1 >> 0;
			if (w < 800) {
				a.d[w] = ((rem + 48 >> 0) << 24 >>> 24);
			} else if (!((rem === 0))) {
				a.trunc = true;
			}
			n = quo;
			r = r - 1 >> 0;
		}
		while (n > 0) {
			quo$1 = (_q$1 = n / 10, (_q$1 === _q$1 && _q$1 !== 1/0 && _q$1 !== -1/0) ? _q$1 >> 0 : $throwRuntimeError("integer divide by zero"));
			rem$1 = n - ((((10 >>> 16 << 16) * quo$1 >> 0) + (10 << 16 >>> 16) * quo$1) >> 0) >> 0;
			w = w - 1 >> 0;
			if (w < 800) {
				a.d[w] = ((rem$1 + 48 >> 0) << 24 >>> 24);
			} else if (!((rem$1 === 0))) {
				a.trunc = true;
			}
			n = quo$1;
		}
		a.nd = a.nd + (delta) >> 0;
		if (a.nd >= 800) {
			a.nd = 800;
		}
		a.dp = a.dp + (delta) >> 0;
		trim(a);
	};
	decimal.Ptr.prototype.Shift = function(k) {
		var a;
		a = this;
		if (a.nd === 0) {
		} else if (k > 0) {
			while (k > 27) {
				leftShift(a, 27);
				k = k - 27 >> 0;
			}
			leftShift(a, (k >>> 0));
		} else if (k < 0) {
			while (k < -27) {
				rightShift(a, 27);
				k = k + 27 >> 0;
			}
			rightShift(a, (-k >>> 0));
		}
	};
	decimal.prototype.Shift = function(k) { return this.$val.Shift(k); };
	shouldRoundUp = function(a, nd) {
		var _r;
		if (nd < 0 || nd >= a.nd) {
			return false;
		}
		if ((a.d[nd] === 53) && ((nd + 1 >> 0) === a.nd)) {
			if (a.trunc) {
				return true;
			}
			return nd > 0 && !(((_r = ((a.d[(nd - 1 >> 0)] - 48 << 24 >>> 24)) % 2, _r === _r ? _r : $throwRuntimeError("integer divide by zero")) === 0));
		}
		return a.d[nd] >= 53;
	};
	decimal.Ptr.prototype.Round = function(nd) {
		var a;
		a = this;
		if (nd < 0 || nd >= a.nd) {
			return;
		}
		if (shouldRoundUp(a, nd)) {
			a.RoundUp(nd);
		} else {
			a.RoundDown(nd);
		}
	};
	decimal.prototype.Round = function(nd) { return this.$val.Round(nd); };
	decimal.Ptr.prototype.RoundDown = function(nd) {
		var a;
		a = this;
		if (nd < 0 || nd >= a.nd) {
			return;
		}
		a.nd = nd;
		trim(a);
	};
	decimal.prototype.RoundDown = function(nd) { return this.$val.RoundDown(nd); };
	decimal.Ptr.prototype.RoundUp = function(nd) {
		var a, i, c, _lhs, _index;
		a = this;
		if (nd < 0 || nd >= a.nd) {
			return;
		}
		i = nd - 1 >> 0;
		while (i >= 0) {
			c = a.d[i];
			if (c < 57) {
				_lhs = a.d; _index = i; _lhs[_index] = _lhs[_index] + 1 << 24 >>> 24;
				a.nd = i + 1 >> 0;
				return;
			}
			i = i - 1 >> 0;
		}
		a.d[0] = 49;
		a.nd = 1;
		a.dp = a.dp + 1 >> 0;
	};
	decimal.prototype.RoundUp = function(nd) { return this.$val.RoundUp(nd); };
	decimal.Ptr.prototype.RoundedInteger = function() {
		var a, i, n, x, x$1;
		a = this;
		if (a.dp > 20) {
			return new $Uint64(4294967295, 4294967295);
		}
		i = 0;
		n = new $Uint64(0, 0);
		i = 0;
		while (i < a.dp && i < a.nd) {
			n = (x = $mul64(n, new $Uint64(0, 10)), x$1 = new $Uint64(0, (a.d[i] - 48 << 24 >>> 24)), new $Uint64(x.high + x$1.high, x.low + x$1.low));
			i = i + 1 >> 0;
		}
		while (i < a.dp) {
			n = $mul64(n, new $Uint64(0, 10));
			i = i + 1 >> 0;
		}
		if (shouldRoundUp(a, a.dp)) {
			n = new $Uint64(n.high + 0, n.low + 1);
		}
		return n;
	};
	decimal.prototype.RoundedInteger = function() { return this.$val.RoundedInteger(); };
	extFloat.Ptr.prototype.floatBits = function(flt) {
		var bits, overflow, f, exp, n, mant, x, x$1, x$2, x$3, y, x$4, x$5, y$1, x$6, x$7, x$8, y$2, x$9;
		bits = new $Uint64(0, 0);
		overflow = false;
		f = this;
		f.Normalize();
		exp = f.exp + 63 >> 0;
		if (exp < (flt.bias + 1 >> 0)) {
			n = (flt.bias + 1 >> 0) - exp >> 0;
			f.mant = $shiftRightUint64(f.mant, ((n >>> 0)));
			exp = exp + (n) >> 0;
		}
		mant = $shiftRightUint64(f.mant, ((63 - flt.mantbits >>> 0)));
		if (!((x = (x$1 = f.mant, x$2 = $shiftLeft64(new $Uint64(0, 1), ((62 - flt.mantbits >>> 0))), new $Uint64(x$1.high & x$2.high, (x$1.low & x$2.low) >>> 0)), (x.high === 0 && x.low === 0)))) {
			mant = new $Uint64(mant.high + 0, mant.low + 1);
		}
		if ((x$3 = $shiftLeft64(new $Uint64(0, 2), flt.mantbits), (mant.high === x$3.high && mant.low === x$3.low))) {
			mant = $shiftRightUint64(mant, 1);
			exp = exp + 1 >> 0;
		}
		if ((exp - flt.bias >> 0) >= (((y = flt.expbits, y < 32 ? (1 << y) : 0) >> 0) - 1 >> 0)) {
			mant = new $Uint64(0, 0);
			exp = (((y$1 = flt.expbits, y$1 < 32 ? (1 << y$1) : 0) >> 0) - 1 >> 0) + flt.bias >> 0;
			overflow = true;
		} else if ((x$4 = (x$5 = $shiftLeft64(new $Uint64(0, 1), flt.mantbits), new $Uint64(mant.high & x$5.high, (mant.low & x$5.low) >>> 0)), (x$4.high === 0 && x$4.low === 0))) {
			exp = flt.bias;
		}
		bits = (x$6 = (x$7 = $shiftLeft64(new $Uint64(0, 1), flt.mantbits), new $Uint64(x$7.high - 0, x$7.low - 1)), new $Uint64(mant.high & x$6.high, (mant.low & x$6.low) >>> 0));
		bits = (x$8 = $shiftLeft64(new $Uint64(0, (((exp - flt.bias >> 0)) & ((((y$2 = flt.expbits, y$2 < 32 ? (1 << y$2) : 0) >> 0) - 1 >> 0)))), flt.mantbits), new $Uint64(bits.high | x$8.high, (bits.low | x$8.low) >>> 0));
		if (f.neg) {
			bits = (x$9 = $shiftLeft64(new $Uint64(0, 1), ((flt.mantbits + flt.expbits >>> 0))), new $Uint64(bits.high | x$9.high, (bits.low | x$9.low) >>> 0));
		}
		return [bits, overflow];
	};
	extFloat.prototype.floatBits = function(flt) { return this.$val.floatBits(flt); };
	extFloat.Ptr.prototype.AssignComputeBounds = function(mant, exp, neg, flt) {
		var lower, upper, f, x, _tmp, _struct, _tmp$1, _struct$1, _struct$2, _struct$3, expBiased, x$1, x$2, x$3, x$4, _struct$4, _struct$5;
		lower = new extFloat.Ptr();
		upper = new extFloat.Ptr();
		f = this;
		f.mant = mant;
		f.exp = exp - (flt.mantbits >> 0) >> 0;
		f.neg = neg;
		if (f.exp <= 0 && (x = $shiftLeft64(($shiftRightUint64(mant, (-f.exp >>> 0))), (-f.exp >>> 0)), (mant.high === x.high && mant.low === x.low))) {
			f.mant = $shiftRightUint64(f.mant, ((-f.exp >>> 0)));
			f.exp = 0;
			_tmp = (_struct = f, new extFloat.Ptr(_struct.mant, _struct.exp, _struct.neg)); _tmp$1 = (_struct$1 = f, new extFloat.Ptr(_struct$1.mant, _struct$1.exp, _struct$1.neg)); lower = _tmp; upper = _tmp$1;
			return [(_struct$2 = lower, new extFloat.Ptr(_struct$2.mant, _struct$2.exp, _struct$2.neg)), (_struct$3 = upper, new extFloat.Ptr(_struct$3.mant, _struct$3.exp, _struct$3.neg))];
		}
		expBiased = exp - flt.bias >> 0;
		upper = new extFloat.Ptr((x$1 = $mul64(new $Uint64(0, 2), f.mant), new $Uint64(x$1.high + 0, x$1.low + 1)), f.exp - 1 >> 0, f.neg);
		if (!((x$2 = $shiftLeft64(new $Uint64(0, 1), flt.mantbits), (mant.high === x$2.high && mant.low === x$2.low))) || (expBiased === 1)) {
			lower = new extFloat.Ptr((x$3 = $mul64(new $Uint64(0, 2), f.mant), new $Uint64(x$3.high - 0, x$3.low - 1)), f.exp - 1 >> 0, f.neg);
		} else {
			lower = new extFloat.Ptr((x$4 = $mul64(new $Uint64(0, 4), f.mant), new $Uint64(x$4.high - 0, x$4.low - 1)), f.exp - 2 >> 0, f.neg);
		}
		return [(_struct$4 = lower, new extFloat.Ptr(_struct$4.mant, _struct$4.exp, _struct$4.neg)), (_struct$5 = upper, new extFloat.Ptr(_struct$5.mant, _struct$5.exp, _struct$5.neg))];
	};
	extFloat.prototype.AssignComputeBounds = function(mant, exp, neg, flt) { return this.$val.AssignComputeBounds(mant, exp, neg, flt); };
	extFloat.Ptr.prototype.Normalize = function() {
		var shift, f, _tmp, _tmp$1, mant, exp, x, x$1, x$2, x$3, x$4, x$5, _tmp$2, _tmp$3;
		shift = 0;
		f = this;
		_tmp = f.mant; _tmp$1 = f.exp; mant = _tmp; exp = _tmp$1;
		if ((mant.high === 0 && mant.low === 0)) {
			shift = 0;
			return shift;
		}
		if ((x = $shiftRightUint64(mant, 32), (x.high === 0 && x.low === 0))) {
			mant = $shiftLeft64(mant, 32);
			exp = exp - 32 >> 0;
		}
		if ((x$1 = $shiftRightUint64(mant, 48), (x$1.high === 0 && x$1.low === 0))) {
			mant = $shiftLeft64(mant, 16);
			exp = exp - 16 >> 0;
		}
		if ((x$2 = $shiftRightUint64(mant, 56), (x$2.high === 0 && x$2.low === 0))) {
			mant = $shiftLeft64(mant, 8);
			exp = exp - 8 >> 0;
		}
		if ((x$3 = $shiftRightUint64(mant, 60), (x$3.high === 0 && x$3.low === 0))) {
			mant = $shiftLeft64(mant, 4);
			exp = exp - 4 >> 0;
		}
		if ((x$4 = $shiftRightUint64(mant, 62), (x$4.high === 0 && x$4.low === 0))) {
			mant = $shiftLeft64(mant, 2);
			exp = exp - 2 >> 0;
		}
		if ((x$5 = $shiftRightUint64(mant, 63), (x$5.high === 0 && x$5.low === 0))) {
			mant = $shiftLeft64(mant, 1);
			exp = exp - 1 >> 0;
		}
		shift = ((f.exp - exp >> 0) >>> 0);
		_tmp$2 = mant; _tmp$3 = exp; f.mant = _tmp$2; f.exp = _tmp$3;
		return shift;
	};
	extFloat.prototype.Normalize = function() { return this.$val.Normalize(); };
	extFloat.Ptr.prototype.Multiply = function(g) {
		var f, _tmp, _tmp$1, fhi, flo, _tmp$2, _tmp$3, ghi, glo, cross1, cross2, x, x$1, x$2, x$3, x$4, x$5, x$6, x$7, rem, x$8, x$9;
		f = this;
		_tmp = $shiftRightUint64(f.mant, 32); _tmp$1 = new $Uint64(0, (f.mant.low >>> 0)); fhi = _tmp; flo = _tmp$1;
		_tmp$2 = $shiftRightUint64(g.mant, 32); _tmp$3 = new $Uint64(0, (g.mant.low >>> 0)); ghi = _tmp$2; glo = _tmp$3;
		cross1 = $mul64(fhi, glo);
		cross2 = $mul64(flo, ghi);
		f.mant = (x = (x$1 = $mul64(fhi, ghi), x$2 = $shiftRightUint64(cross1, 32), new $Uint64(x$1.high + x$2.high, x$1.low + x$2.low)), x$3 = $shiftRightUint64(cross2, 32), new $Uint64(x.high + x$3.high, x.low + x$3.low));
		rem = (x$4 = (x$5 = new $Uint64(0, (cross1.low >>> 0)), x$6 = new $Uint64(0, (cross2.low >>> 0)), new $Uint64(x$5.high + x$6.high, x$5.low + x$6.low)), x$7 = $shiftRightUint64(($mul64(flo, glo)), 32), new $Uint64(x$4.high + x$7.high, x$4.low + x$7.low));
		rem = new $Uint64(rem.high + 0, rem.low + 2147483648);
		f.mant = (x$8 = f.mant, x$9 = ($shiftRightUint64(rem, 32)), new $Uint64(x$8.high + x$9.high, x$8.low + x$9.low));
		f.exp = (f.exp + g.exp >> 0) + 64 >> 0;
	};
	extFloat.prototype.Multiply = function(g) { return this.$val.Multiply(g); };
	extFloat.Ptr.prototype.AssignDecimal = function(mantissa, exp10, neg, trunc, flt) {
		var ok, f, errors$1, _q, i, _r, adjExp, x, _struct, _struct$1, shift, y, denormalExp, extrabits, halfway, x$1, x$2, x$3, mant_extra, x$4, x$5, x$6, x$7, x$8, x$9, x$10, x$11;
		ok = false;
		f = this;
		errors$1 = 0;
		if (trunc) {
			errors$1 = errors$1 + 4 >> 0;
		}
		f.mant = mantissa;
		f.exp = 0;
		f.neg = neg;
		i = (_q = ((exp10 - -348 >> 0)) / 8, (_q === _q && _q !== 1/0 && _q !== -1/0) ? _q >> 0 : $throwRuntimeError("integer divide by zero"));
		if (exp10 < -348 || i >= 87) {
			ok = false;
			return ok;
		}
		adjExp = (_r = ((exp10 - -348 >> 0)) % 8, _r === _r ? _r : $throwRuntimeError("integer divide by zero"));
		if (adjExp < 19 && (x = uint64pow10[(19 - adjExp >> 0)], (mantissa.high < x.high || (mantissa.high === x.high && mantissa.low < x.low)))) {
			f.mant = $mul64(f.mant, (uint64pow10[adjExp]));
			f.Normalize();
		} else {
			f.Normalize();
			f.Multiply((_struct = smallPowersOfTen[adjExp], new extFloat.Ptr(_struct.mant, _struct.exp, _struct.neg)));
			errors$1 = errors$1 + 4 >> 0;
		}
		f.Multiply((_struct$1 = powersOfTen[i], new extFloat.Ptr(_struct$1.mant, _struct$1.exp, _struct$1.neg)));
		if (errors$1 > 0) {
			errors$1 = errors$1 + 1 >> 0;
		}
		errors$1 = errors$1 + 4 >> 0;
		shift = f.Normalize();
		errors$1 = (y = (shift), y < 32 ? (errors$1 << y) : 0) >> 0;
		denormalExp = flt.bias - 63 >> 0;
		extrabits = 0;
		if (f.exp <= denormalExp) {
			extrabits = (((63 - flt.mantbits >>> 0) + 1 >>> 0) + ((denormalExp - f.exp >> 0) >>> 0) >>> 0);
		} else {
			extrabits = (63 - flt.mantbits >>> 0);
		}
		halfway = $shiftLeft64(new $Uint64(0, 1), ((extrabits - 1 >>> 0)));
		mant_extra = (x$1 = f.mant, x$2 = (x$3 = $shiftLeft64(new $Uint64(0, 1), extrabits), new $Uint64(x$3.high - 0, x$3.low - 1)), new $Uint64(x$1.high & x$2.high, (x$1.low & x$2.low) >>> 0));
		if ((x$4 = (x$5 = new $Int64(halfway.high, halfway.low), x$6 = new $Int64(0, errors$1), new $Int64(x$5.high - x$6.high, x$5.low - x$6.low)), x$7 = new $Int64(mant_extra.high, mant_extra.low), (x$4.high < x$7.high || (x$4.high === x$7.high && x$4.low < x$7.low))) && (x$8 = new $Int64(mant_extra.high, mant_extra.low), x$9 = (x$10 = new $Int64(halfway.high, halfway.low), x$11 = new $Int64(0, errors$1), new $Int64(x$10.high + x$11.high, x$10.low + x$11.low)), (x$8.high < x$9.high || (x$8.high === x$9.high && x$8.low < x$9.low)))) {
			ok = false;
			return ok;
		}
		ok = true;
		return ok;
	};
	extFloat.prototype.AssignDecimal = function(mantissa, exp10, neg, trunc, flt) { return this.$val.AssignDecimal(mantissa, exp10, neg, trunc, flt); };
	extFloat.Ptr.prototype.frexp10 = function() {
		var exp10, index, f, _q, x, approxExp10, _q$1, i, exp, _struct, _tmp, _tmp$1;
		exp10 = 0;
		index = 0;
		f = this;
		approxExp10 = (_q = (x = (-46 - f.exp >> 0), (((x >>> 16 << 16) * 28 >> 0) + (x << 16 >>> 16) * 28) >> 0) / 93, (_q === _q && _q !== 1/0 && _q !== -1/0) ? _q >> 0 : $throwRuntimeError("integer divide by zero"));
		i = (_q$1 = ((approxExp10 - -348 >> 0)) / 8, (_q$1 === _q$1 && _q$1 !== 1/0 && _q$1 !== -1/0) ? _q$1 >> 0 : $throwRuntimeError("integer divide by zero"));
		Loop:
		while (true) {
			exp = (f.exp + powersOfTen[i].exp >> 0) + 64 >> 0;
			if (exp < -60) {
				i = i + 1 >> 0;
			} else if (exp > -32) {
				i = i - 1 >> 0;
			} else {
				break Loop;
			}
		}
		f.Multiply((_struct = powersOfTen[i], new extFloat.Ptr(_struct.mant, _struct.exp, _struct.neg)));
		_tmp = -((-348 + ((((i >>> 16 << 16) * 8 >> 0) + (i << 16 >>> 16) * 8) >> 0) >> 0)); _tmp$1 = i; exp10 = _tmp; index = _tmp$1;
		return [exp10, index];
	};
	extFloat.prototype.frexp10 = function() { return this.$val.frexp10(); };
	frexp10Many = function(a, b, c) {
		var exp10, _tuple, i, _struct, _struct$1;
		exp10 = 0;
		_tuple = c.frexp10(); exp10 = _tuple[0]; i = _tuple[1];
		a.Multiply((_struct = powersOfTen[i], new extFloat.Ptr(_struct.mant, _struct.exp, _struct.neg)));
		b.Multiply((_struct$1 = powersOfTen[i], new extFloat.Ptr(_struct$1.mant, _struct$1.exp, _struct$1.neg)));
		return exp10;
	};
	extFloat.Ptr.prototype.FixedDecimal = function(d, n) {
		var f, x, _tuple, exp10, shift, integer, x$1, x$2, fraction, nonAsciiName, needed, integerDigits, pow10, _tmp, _tmp$1, i, pow, x$3, rest, _q, x$4, buf, pos, v, _q$1, v1, i$1, x$5, x$6, nd, x$7, x$8, digit, x$9, x$10, x$11, ok, i$2, x$12;
		f = this;
		if ((x = f.mant, (x.high === 0 && x.low === 0))) {
			d.nd = 0;
			d.dp = 0;
			d.neg = f.neg;
			return true;
		}
		if (n === 0) {
			throw $panic(new $String("strconv: internal error: extFloat.FixedDecimal called with n == 0"));
		}
		f.Normalize();
		_tuple = f.frexp10(); exp10 = _tuple[0];
		shift = (-f.exp >>> 0);
		integer = ($shiftRightUint64(f.mant, shift).low >>> 0);
		fraction = (x$1 = f.mant, x$2 = $shiftLeft64(new $Uint64(0, integer), shift), new $Uint64(x$1.high - x$2.high, x$1.low - x$2.low));
		nonAsciiName = new $Uint64(0, 1);
		needed = n;
		integerDigits = 0;
		pow10 = new $Uint64(0, 1);
		_tmp = 0; _tmp$1 = new $Uint64(0, 1); i = _tmp; pow = _tmp$1;
		while (i < 20) {
			if ((x$3 = new $Uint64(0, integer), (pow.high > x$3.high || (pow.high === x$3.high && pow.low > x$3.low)))) {
				integerDigits = i;
				break;
			}
			pow = $mul64(pow, new $Uint64(0, 10));
			i = i + 1 >> 0;
		}
		rest = integer;
		if (integerDigits > needed) {
			pow10 = uint64pow10[(integerDigits - needed >> 0)];
			integer = (_q = integer / ((pow10.low >>> 0)), (_q === _q && _q !== 1/0 && _q !== -1/0) ? _q >>> 0 : $throwRuntimeError("integer divide by zero"));
			rest = rest - ((x$4 = (pow10.low >>> 0), (((integer >>> 16 << 16) * x$4 >>> 0) + (integer << 16 >>> 16) * x$4) >>> 0)) >>> 0;
		} else {
			rest = 0;
		}
		buf = $makeNativeArray("Uint8", 32, function() { return 0; });
		pos = 32;
		v = integer;
		while (v > 0) {
			v1 = (_q$1 = v / 10, (_q$1 === _q$1 && _q$1 !== 1/0 && _q$1 !== -1/0) ? _q$1 >>> 0 : $throwRuntimeError("integer divide by zero"));
			v = v - (((((10 >>> 16 << 16) * v1 >>> 0) + (10 << 16 >>> 16) * v1) >>> 0)) >>> 0;
			pos = pos - 1 >> 0;
			buf[pos] = ((v + 48 >>> 0) << 24 >>> 24);
			v = v1;
		}
		i$1 = pos;
		while (i$1 < 32) {
			(x$5 = d.d, x$6 = i$1 - pos >> 0, (x$6 < 0 || x$6 >= x$5.length) ? $throwRuntimeError("index out of range") : x$5.array[x$5.offset + x$6] = buf[i$1]);
			i$1 = i$1 + 1 >> 0;
		}
		nd = 32 - pos >> 0;
		d.nd = nd;
		d.dp = integerDigits + exp10 >> 0;
		needed = needed - (nd) >> 0;
		if (needed > 0) {
			if (!((rest === 0)) || !((pow10.high === 0 && pow10.low === 1))) {
				throw $panic(new $String("strconv: internal error, rest != 0 but needed > 0"));
			}
			while (needed > 0) {
				fraction = $mul64(fraction, new $Uint64(0, 10));
				nonAsciiName = $mul64(nonAsciiName, new $Uint64(0, 10));
				if ((x$7 = $mul64(new $Uint64(0, 2), nonAsciiName), x$8 = $shiftLeft64(new $Uint64(0, 1), shift), (x$7.high > x$8.high || (x$7.high === x$8.high && x$7.low > x$8.low)))) {
					return false;
				}
				digit = $shiftRightUint64(fraction, shift);
				(x$9 = d.d, (nd < 0 || nd >= x$9.length) ? $throwRuntimeError("index out of range") : x$9.array[x$9.offset + nd] = (new $Uint64(digit.high + 0, digit.low + 48).low << 24 >>> 24));
				fraction = (x$10 = $shiftLeft64(digit, shift), new $Uint64(fraction.high - x$10.high, fraction.low - x$10.low));
				nd = nd + 1 >> 0;
				needed = needed - 1 >> 0;
			}
			d.nd = nd;
		}
		ok = adjustLastDigitFixed(d, (x$11 = $shiftLeft64(new $Uint64(0, rest), shift), new $Uint64(x$11.high | fraction.high, (x$11.low | fraction.low) >>> 0)), pow10, shift, nonAsciiName);
		if (!ok) {
			return false;
		}
		i$2 = d.nd - 1 >> 0;
		while (i$2 >= 0) {
			if (!(((x$12 = d.d, ((i$2 < 0 || i$2 >= x$12.length) ? $throwRuntimeError("index out of range") : x$12.array[x$12.offset + i$2])) === 48))) {
				d.nd = i$2 + 1 >> 0;
				break;
			}
			i$2 = i$2 - 1 >> 0;
		}
		return true;
	};
	extFloat.prototype.FixedDecimal = function(d, n) { return this.$val.FixedDecimal(d, n); };
	adjustLastDigitFixed = function(d, num, den, shift, nonAsciiName) {
		var x, x$1, x$2, x$3, x$4, x$5, x$6, i, x$7, x$8, _lhs, _index;
		if ((x = $shiftLeft64(den, shift), (num.high > x.high || (num.high === x.high && num.low > x.low)))) {
			throw $panic(new $String("strconv: num > den<<shift in adjustLastDigitFixed"));
		}
		if ((x$1 = $mul64(new $Uint64(0, 2), nonAsciiName), x$2 = $shiftLeft64(den, shift), (x$1.high > x$2.high || (x$1.high === x$2.high && x$1.low > x$2.low)))) {
			throw $panic(new $String("strconv: \xCE\xB5 > (den<<shift)/2"));
		}
		if ((x$3 = $mul64(new $Uint64(0, 2), (new $Uint64(num.high + nonAsciiName.high, num.low + nonAsciiName.low))), x$4 = $shiftLeft64(den, shift), (x$3.high < x$4.high || (x$3.high === x$4.high && x$3.low < x$4.low)))) {
			return true;
		}
		if ((x$5 = $mul64(new $Uint64(0, 2), (new $Uint64(num.high - nonAsciiName.high, num.low - nonAsciiName.low))), x$6 = $shiftLeft64(den, shift), (x$5.high > x$6.high || (x$5.high === x$6.high && x$5.low > x$6.low)))) {
			i = d.nd - 1 >> 0;
			while (i >= 0) {
				if ((x$7 = d.d, ((i < 0 || i >= x$7.length) ? $throwRuntimeError("index out of range") : x$7.array[x$7.offset + i])) === 57) {
					d.nd = d.nd - 1 >> 0;
				} else {
					break;
				}
				i = i - 1 >> 0;
			}
			if (i < 0) {
				(x$8 = d.d, (0 < 0 || 0 >= x$8.length) ? $throwRuntimeError("index out of range") : x$8.array[x$8.offset + 0] = 49);
				d.nd = 1;
				d.dp = d.dp + 1 >> 0;
			} else {
				_lhs = d.d; _index = i; (_index < 0 || _index >= _lhs.length) ? $throwRuntimeError("index out of range") : _lhs.array[_lhs.offset + _index] = ((_index < 0 || _index >= _lhs.length) ? $throwRuntimeError("index out of range") : _lhs.array[_lhs.offset + _index]) + 1 << 24 >>> 24;
			}
			return true;
		}
		return false;
	};
	extFloat.Ptr.prototype.ShortestDecimal = function(d, lower, upper) {
		var f, x, x$1, y, x$2, y$1, buf, n, v, v1, x$3, nd, i, x$4, _tmp, _tmp$1, x$5, x$6, exp10, x$7, x$8, shift, integer, x$9, x$10, fraction, x$11, x$12, allowance, x$13, x$14, targetDiff, integerDigits, _tmp$2, _tmp$3, i$1, pow, x$15, i$2, pow$1, _q, digit, x$16, x$17, x$18, currentDiff, digit$1, multiplier, x$19, x$20, x$21, x$22;
		f = this;
		if ((x = f.mant, (x.high === 0 && x.low === 0))) {
			d.nd = 0;
			d.dp = 0;
			d.neg = f.neg;
			return true;
		}
		if ((f.exp === 0) && (x$1 = lower, y = f, (x$1.mant.high === y.mant.high && x$1.mant.low === y.mant.low) && x$1.exp === y.exp && x$1.neg === y.neg) && (x$2 = lower, y$1 = upper, (x$2.mant.high === y$1.mant.high && x$2.mant.low === y$1.mant.low) && x$2.exp === y$1.exp && x$2.neg === y$1.neg)) {
			buf = $makeNativeArray("Uint8", 24, function() { return 0; });
			n = 23;
			v = f.mant;
			while ((v.high > 0 || (v.high === 0 && v.low > 0))) {
				v1 = $div64(v, new $Uint64(0, 10), false);
				v = (x$3 = $mul64(new $Uint64(0, 10), v1), new $Uint64(v.high - x$3.high, v.low - x$3.low));
				buf[n] = (new $Uint64(v.high + 0, v.low + 48).low << 24 >>> 24);
				n = n - 1 >> 0;
				v = v1;
			}
			nd = (24 - n >> 0) - 1 >> 0;
			i = 0;
			while (i < nd) {
				(x$4 = d.d, (i < 0 || i >= x$4.length) ? $throwRuntimeError("index out of range") : x$4.array[x$4.offset + i] = buf[((n + 1 >> 0) + i >> 0)]);
				i = i + 1 >> 0;
			}
			_tmp = nd; _tmp$1 = nd; d.nd = _tmp; d.dp = _tmp$1;
			while (d.nd > 0 && ((x$5 = d.d, x$6 = d.nd - 1 >> 0, ((x$6 < 0 || x$6 >= x$5.length) ? $throwRuntimeError("index out of range") : x$5.array[x$5.offset + x$6])) === 48)) {
				d.nd = d.nd - 1 >> 0;
			}
			if (d.nd === 0) {
				d.dp = 0;
			}
			d.neg = f.neg;
			return true;
		}
		upper.Normalize();
		if (f.exp > upper.exp) {
			f.mant = $shiftLeft64(f.mant, (((f.exp - upper.exp >> 0) >>> 0)));
			f.exp = upper.exp;
		}
		if (lower.exp > upper.exp) {
			lower.mant = $shiftLeft64(lower.mant, (((lower.exp - upper.exp >> 0) >>> 0)));
			lower.exp = upper.exp;
		}
		exp10 = frexp10Many(lower, f, upper);
		upper.mant = (x$7 = upper.mant, new $Uint64(x$7.high + 0, x$7.low + 1));
		lower.mant = (x$8 = lower.mant, new $Uint64(x$8.high - 0, x$8.low - 1));
		shift = (-upper.exp >>> 0);
		integer = ($shiftRightUint64(upper.mant, shift).low >>> 0);
		fraction = (x$9 = upper.mant, x$10 = $shiftLeft64(new $Uint64(0, integer), shift), new $Uint64(x$9.high - x$10.high, x$9.low - x$10.low));
		allowance = (x$11 = upper.mant, x$12 = lower.mant, new $Uint64(x$11.high - x$12.high, x$11.low - x$12.low));
		targetDiff = (x$13 = upper.mant, x$14 = f.mant, new $Uint64(x$13.high - x$14.high, x$13.low - x$14.low));
		integerDigits = 0;
		_tmp$2 = 0; _tmp$3 = new $Uint64(0, 1); i$1 = _tmp$2; pow = _tmp$3;
		while (i$1 < 20) {
			if ((x$15 = new $Uint64(0, integer), (pow.high > x$15.high || (pow.high === x$15.high && pow.low > x$15.low)))) {
				integerDigits = i$1;
				break;
			}
			pow = $mul64(pow, new $Uint64(0, 10));
			i$1 = i$1 + 1 >> 0;
		}
		i$2 = 0;
		while (i$2 < integerDigits) {
			pow$1 = uint64pow10[((integerDigits - i$2 >> 0) - 1 >> 0)];
			digit = (_q = integer / (pow$1.low >>> 0), (_q === _q && _q !== 1/0 && _q !== -1/0) ? _q >>> 0 : $throwRuntimeError("integer divide by zero"));
			(x$16 = d.d, (i$2 < 0 || i$2 >= x$16.length) ? $throwRuntimeError("index out of range") : x$16.array[x$16.offset + i$2] = ((digit + 48 >>> 0) << 24 >>> 24));
			integer = integer - ((x$17 = (pow$1.low >>> 0), (((digit >>> 16 << 16) * x$17 >>> 0) + (digit << 16 >>> 16) * x$17) >>> 0)) >>> 0;
			currentDiff = (x$18 = $shiftLeft64(new $Uint64(0, integer), shift), new $Uint64(x$18.high + fraction.high, x$18.low + fraction.low));
			if ((currentDiff.high < allowance.high || (currentDiff.high === allowance.high && currentDiff.low < allowance.low))) {
				d.nd = i$2 + 1 >> 0;
				d.dp = integerDigits + exp10 >> 0;
				d.neg = f.neg;
				return adjustLastDigit(d, currentDiff, targetDiff, allowance, $shiftLeft64(pow$1, shift), new $Uint64(0, 2));
			}
			i$2 = i$2 + 1 >> 0;
		}
		d.nd = integerDigits;
		d.dp = d.nd + exp10 >> 0;
		d.neg = f.neg;
		digit$1 = 0;
		multiplier = new $Uint64(0, 1);
		while (true) {
			fraction = $mul64(fraction, new $Uint64(0, 10));
			multiplier = $mul64(multiplier, new $Uint64(0, 10));
			digit$1 = ($shiftRightUint64(fraction, shift).low >> 0);
			(x$19 = d.d, x$20 = d.nd, (x$20 < 0 || x$20 >= x$19.length) ? $throwRuntimeError("index out of range") : x$19.array[x$19.offset + x$20] = ((digit$1 + 48 >> 0) << 24 >>> 24));
			d.nd = d.nd + 1 >> 0;
			fraction = (x$21 = $shiftLeft64(new $Uint64(0, digit$1), shift), new $Uint64(fraction.high - x$21.high, fraction.low - x$21.low));
			if ((x$22 = $mul64(allowance, multiplier), (fraction.high < x$22.high || (fraction.high === x$22.high && fraction.low < x$22.low)))) {
				return adjustLastDigit(d, fraction, $mul64(targetDiff, multiplier), $mul64(allowance, multiplier), $shiftLeft64(new $Uint64(0, 1), shift), $mul64(multiplier, new $Uint64(0, 2)));
			}
		}
	};
	extFloat.prototype.ShortestDecimal = function(d, lower, upper) { return this.$val.ShortestDecimal(d, lower, upper); };
	adjustLastDigit = function(d, currentDiff, targetDiff, maxDiff, ulpDecimal, ulpBinary) {
		var x, x$1, x$2, x$3, _lhs, _index, x$4, x$5, x$6, x$7, x$8, x$9, x$10;
		if ((x = $mul64(new $Uint64(0, 2), ulpBinary), (ulpDecimal.high < x.high || (ulpDecimal.high === x.high && ulpDecimal.low < x.low)))) {
			return false;
		}
		while ((x$1 = (x$2 = (x$3 = $div64(ulpDecimal, new $Uint64(0, 2), false), new $Uint64(currentDiff.high + x$3.high, currentDiff.low + x$3.low)), new $Uint64(x$2.high + ulpBinary.high, x$2.low + ulpBinary.low)), (x$1.high < targetDiff.high || (x$1.high === targetDiff.high && x$1.low < targetDiff.low)))) {
			_lhs = d.d; _index = d.nd - 1 >> 0; (_index < 0 || _index >= _lhs.length) ? $throwRuntimeError("index out of range") : _lhs.array[_lhs.offset + _index] = ((_index < 0 || _index >= _lhs.length) ? $throwRuntimeError("index out of range") : _lhs.array[_lhs.offset + _index]) - 1 << 24 >>> 24;
			currentDiff = (x$4 = ulpDecimal, new $Uint64(currentDiff.high + x$4.high, currentDiff.low + x$4.low));
		}
		if ((x$5 = new $Uint64(currentDiff.high + ulpDecimal.high, currentDiff.low + ulpDecimal.low), x$6 = (x$7 = (x$8 = $div64(ulpDecimal, new $Uint64(0, 2), false), new $Uint64(targetDiff.high + x$8.high, targetDiff.low + x$8.low)), new $Uint64(x$7.high + ulpBinary.high, x$7.low + ulpBinary.low)), (x$5.high < x$6.high || (x$5.high === x$6.high && x$5.low <= x$6.low)))) {
			return false;
		}
		if ((currentDiff.high < ulpBinary.high || (currentDiff.high === ulpBinary.high && currentDiff.low < ulpBinary.low)) || (x$9 = new $Uint64(maxDiff.high - ulpBinary.high, maxDiff.low - ulpBinary.low), (currentDiff.high > x$9.high || (currentDiff.high === x$9.high && currentDiff.low > x$9.low)))) {
			return false;
		}
		if ((d.nd === 1) && ((x$10 = d.d, ((0 < 0 || 0 >= x$10.length) ? $throwRuntimeError("index out of range") : x$10.array[x$10.offset + 0])) === 48)) {
			d.nd = 0;
			d.dp = 0;
		}
		return true;
	};
	AppendFloat = $pkg.AppendFloat = function(dst, f, fmt, prec, bitSize) {
		return genericFtoa(dst, f, fmt, prec, bitSize);
	};
	genericFtoa = function(dst, val, fmt, prec, bitSize) {
		var bits, flt, _ref, x, neg, y, exp, x$1, x$2, mant, _ref$1, y$1, s, x$3, digs, ok, shortest, f, _tuple, _struct, lower, _struct$1, upper, buf, _ref$2, digits, _ref$3, buf$1, f$1, _struct$2;
		bits = new $Uint64(0, 0);
		flt = ($ptrType(floatInfo)).nil;
		_ref = bitSize;
		if (_ref === 32) {
			bits = new $Uint64(0, math.Float32bits(val));
			flt = float32info;
		} else if (_ref === 64) {
			bits = math.Float64bits(val);
			flt = float64info;
		} else {
			throw $panic(new $String("strconv: illegal AppendFloat/FormatFloat bitSize"));
		}
		neg = !((x = $shiftRightUint64(bits, ((flt.expbits + flt.mantbits >>> 0))), (x.high === 0 && x.low === 0)));
		exp = ($shiftRightUint64(bits, flt.mantbits).low >> 0) & ((((y = flt.expbits, y < 32 ? (1 << y) : 0) >> 0) - 1 >> 0));
		mant = (x$1 = (x$2 = $shiftLeft64(new $Uint64(0, 1), flt.mantbits), new $Uint64(x$2.high - 0, x$2.low - 1)), new $Uint64(bits.high & x$1.high, (bits.low & x$1.low) >>> 0));
		_ref$1 = exp;
		if (_ref$1 === (((y$1 = flt.expbits, y$1 < 32 ? (1 << y$1) : 0) >> 0) - 1 >> 0)) {
			s = "";
			if (!((mant.high === 0 && mant.low === 0))) {
				s = "NaN";
			} else if (neg) {
				s = "-Inf";
			} else {
				s = "+Inf";
			}
			return $appendSlice(dst, new ($sliceType($Uint8))($stringToBytes(s)));
		} else if (_ref$1 === 0) {
			exp = exp + 1 >> 0;
		} else {
			mant = (x$3 = $shiftLeft64(new $Uint64(0, 1), flt.mantbits), new $Uint64(mant.high | x$3.high, (mant.low | x$3.low) >>> 0));
		}
		exp = exp + (flt.bias) >> 0;
		if (fmt === 98) {
			return fmtB(dst, neg, mant, exp, flt);
		}
		if (!optimize) {
			return bigFtoa(dst, prec, fmt, neg, mant, exp, flt);
		}
		digs = new decimalSlice.Ptr();
		ok = false;
		shortest = prec < 0;
		if (shortest) {
			f = new extFloat.Ptr();
			_tuple = f.AssignComputeBounds(mant, exp, neg, flt); lower = (_struct = _tuple[0], new extFloat.Ptr(_struct.mant, _struct.exp, _struct.neg)); upper = (_struct$1 = _tuple[1], new extFloat.Ptr(_struct$1.mant, _struct$1.exp, _struct$1.neg));
			buf = $makeNativeArray("Uint8", 32, function() { return 0; });
			digs.d = new ($sliceType($Uint8))(buf);
			ok = f.ShortestDecimal(digs, lower, upper);
			if (!ok) {
				return bigFtoa(dst, prec, fmt, neg, mant, exp, flt);
			}
			_ref$2 = fmt;
			if (_ref$2 === 101 || _ref$2 === 69) {
				prec = digs.nd - 1 >> 0;
			} else if (_ref$2 === 102) {
				prec = max(digs.nd - digs.dp >> 0, 0);
			} else if (_ref$2 === 103 || _ref$2 === 71) {
				prec = digs.nd;
			}
		} else if (!((fmt === 102))) {
			digits = prec;
			_ref$3 = fmt;
			if (_ref$3 === 101 || _ref$3 === 69) {
				digits = digits + 1 >> 0;
			} else if (_ref$3 === 103 || _ref$3 === 71) {
				if (prec === 0) {
					prec = 1;
				}
				digits = prec;
			}
			if (digits <= 15) {
				buf$1 = $makeNativeArray("Uint8", 24, function() { return 0; });
				digs.d = new ($sliceType($Uint8))(buf$1);
				f$1 = new extFloat.Ptr(mant, exp - (flt.mantbits >> 0) >> 0, neg);
				ok = f$1.FixedDecimal(digs, digits);
			}
		}
		if (!ok) {
			return bigFtoa(dst, prec, fmt, neg, mant, exp, flt);
		}
		return formatDigits(dst, shortest, neg, (_struct$2 = digs, new decimalSlice.Ptr(_struct$2.d, _struct$2.nd, _struct$2.dp, _struct$2.neg)), prec, fmt);
	};
	bigFtoa = function(dst, prec, fmt, neg, mant, exp, flt) {
		var d, digs, shortest, _ref, _ref$1, _struct;
		d = new decimal.Ptr();
		d.Assign(mant);
		d.Shift(exp - (flt.mantbits >> 0) >> 0);
		digs = new decimalSlice.Ptr();
		shortest = prec < 0;
		if (shortest) {
			roundShortest(d, mant, exp, flt);
			digs = new decimalSlice.Ptr(new ($sliceType($Uint8))(d.d), d.nd, d.dp, false);
			_ref = fmt;
			if (_ref === 101 || _ref === 69) {
				prec = digs.nd - 1 >> 0;
			} else if (_ref === 102) {
				prec = max(digs.nd - digs.dp >> 0, 0);
			} else if (_ref === 103 || _ref === 71) {
				prec = digs.nd;
			}
		} else {
			_ref$1 = fmt;
			if (_ref$1 === 101 || _ref$1 === 69) {
				d.Round(prec + 1 >> 0);
			} else if (_ref$1 === 102) {
				d.Round(d.dp + prec >> 0);
			} else if (_ref$1 === 103 || _ref$1 === 71) {
				if (prec === 0) {
					prec = 1;
				}
				d.Round(prec);
			}
			digs = new decimalSlice.Ptr(new ($sliceType($Uint8))(d.d), d.nd, d.dp, false);
		}
		return formatDigits(dst, shortest, neg, (_struct = digs, new decimalSlice.Ptr(_struct.d, _struct.nd, _struct.dp, _struct.neg)), prec, fmt);
	};
	formatDigits = function(dst, shortest, neg, digs, prec, fmt) {
		var _ref, _struct, _struct$1, eprec, exp, _struct$2, _struct$3;
		_ref = fmt;
		if (_ref === 101 || _ref === 69) {
			return fmtE(dst, neg, (_struct = digs, new decimalSlice.Ptr(_struct.d, _struct.nd, _struct.dp, _struct.neg)), prec, fmt);
		} else if (_ref === 102) {
			return fmtF(dst, neg, (_struct$1 = digs, new decimalSlice.Ptr(_struct$1.d, _struct$1.nd, _struct$1.dp, _struct$1.neg)), prec);
		} else if (_ref === 103 || _ref === 71) {
			eprec = prec;
			if (eprec > digs.nd && digs.nd >= digs.dp) {
				eprec = digs.nd;
			}
			if (shortest) {
				eprec = 6;
			}
			exp = digs.dp - 1 >> 0;
			if (exp < -4 || exp >= eprec) {
				if (prec > digs.nd) {
					prec = digs.nd;
				}
				return fmtE(dst, neg, (_struct$2 = digs, new decimalSlice.Ptr(_struct$2.d, _struct$2.nd, _struct$2.dp, _struct$2.neg)), prec - 1 >> 0, (fmt + 101 << 24 >>> 24) - 103 << 24 >>> 24);
			}
			if (prec > digs.dp) {
				prec = digs.nd;
			}
			return fmtF(dst, neg, (_struct$3 = digs, new decimalSlice.Ptr(_struct$3.d, _struct$3.nd, _struct$3.dp, _struct$3.neg)), max(prec - digs.dp >> 0, 0));
		}
		return $append(dst, 37, fmt);
	};
	roundShortest = function(d, mant, exp, flt) {
		var minexp, x, x$1, upper, x$2, mantlo, explo, x$3, x$4, lower, x$5, x$6, inclusive, i, _tmp, _tmp$1, _tmp$2, l, m, u, okdown, okup;
		if ((mant.high === 0 && mant.low === 0)) {
			d.nd = 0;
			return;
		}
		minexp = flt.bias + 1 >> 0;
		if (exp > minexp && (x = (d.dp - d.nd >> 0), (((332 >>> 16 << 16) * x >> 0) + (332 << 16 >>> 16) * x) >> 0) >= (x$1 = (exp - (flt.mantbits >> 0) >> 0), (((100 >>> 16 << 16) * x$1 >> 0) + (100 << 16 >>> 16) * x$1) >> 0)) {
			return;
		}
		upper = new decimal.Ptr();
		upper.Assign((x$2 = $mul64(mant, new $Uint64(0, 2)), new $Uint64(x$2.high + 0, x$2.low + 1)));
		upper.Shift((exp - (flt.mantbits >> 0) >> 0) - 1 >> 0);
		mantlo = new $Uint64(0, 0);
		explo = 0;
		if ((x$3 = $shiftLeft64(new $Uint64(0, 1), flt.mantbits), (mant.high > x$3.high || (mant.high === x$3.high && mant.low > x$3.low))) || (exp === minexp)) {
			mantlo = new $Uint64(mant.high - 0, mant.low - 1);
			explo = exp;
		} else {
			mantlo = (x$4 = $mul64(mant, new $Uint64(0, 2)), new $Uint64(x$4.high - 0, x$4.low - 1));
			explo = exp - 1 >> 0;
		}
		lower = new decimal.Ptr();
		lower.Assign((x$5 = $mul64(mantlo, new $Uint64(0, 2)), new $Uint64(x$5.high + 0, x$5.low + 1)));
		lower.Shift((explo - (flt.mantbits >> 0) >> 0) - 1 >> 0);
		inclusive = (x$6 = $div64(mant, new $Uint64(0, 2), true), (x$6.high === 0 && x$6.low === 0));
		i = 0;
		while (i < d.nd) {
			_tmp = 0; _tmp$1 = 0; _tmp$2 = 0; l = _tmp; m = _tmp$1; u = _tmp$2;
			if (i < lower.nd) {
				l = lower.d[i];
			} else {
				l = 48;
			}
			m = d.d[i];
			if (i < upper.nd) {
				u = upper.d[i];
			} else {
				u = 48;
			}
			okdown = !((l === m)) || (inclusive && (l === m) && ((i + 1 >> 0) === lower.nd));
			okup = !((m === u)) && (inclusive || (m + 1 << 24 >>> 24) < u || (i + 1 >> 0) < upper.nd);
			if (okdown && okup) {
				d.Round(i + 1 >> 0);
				return;
			} else if (okdown) {
				d.RoundDown(i + 1 >> 0);
				return;
			} else if (okup) {
				d.RoundUp(i + 1 >> 0);
				return;
			}
			i = i + 1 >> 0;
		}
	};
	fmtE = function(dst, neg, d, prec, fmt) {
		var ch, x, i, m, x$1, exp, buf, i$1, _r, _q, _ref;
		if (neg) {
			dst = $append(dst, 45);
		}
		ch = 48;
		if (!((d.nd === 0))) {
			ch = (x = d.d, ((0 < 0 || 0 >= x.length) ? $throwRuntimeError("index out of range") : x.array[x.offset + 0]));
		}
		dst = $append(dst, ch);
		if (prec > 0) {
			dst = $append(dst, 46);
			i = 1;
			m = ((d.nd + prec >> 0) + 1 >> 0) - max(d.nd, prec + 1 >> 0) >> 0;
			while (i < m) {
				dst = $append(dst, (x$1 = d.d, ((i < 0 || i >= x$1.length) ? $throwRuntimeError("index out of range") : x$1.array[x$1.offset + i])));
				i = i + 1 >> 0;
			}
			while (i <= prec) {
				dst = $append(dst, 48);
				i = i + 1 >> 0;
			}
		}
		dst = $append(dst, fmt);
		exp = d.dp - 1 >> 0;
		if (d.nd === 0) {
			exp = 0;
		}
		if (exp < 0) {
			ch = 45;
			exp = -exp;
		} else {
			ch = 43;
		}
		dst = $append(dst, ch);
		buf = $makeNativeArray("Uint8", 3, function() { return 0; });
		i$1 = 3;
		while (exp >= 10) {
			i$1 = i$1 - 1 >> 0;
			buf[i$1] = (((_r = exp % 10, _r === _r ? _r : $throwRuntimeError("integer divide by zero")) + 48 >> 0) << 24 >>> 24);
			exp = (_q = exp / 10, (_q === _q && _q !== 1/0 && _q !== -1/0) ? _q >> 0 : $throwRuntimeError("integer divide by zero"));
		}
		i$1 = i$1 - 1 >> 0;
		buf[i$1] = ((exp + 48 >> 0) << 24 >>> 24);
		_ref = i$1;
		if (_ref === 0) {
			dst = $append(dst, buf[0], buf[1], buf[2]);
		} else if (_ref === 1) {
			dst = $append(dst, buf[1], buf[2]);
		} else if (_ref === 2) {
			dst = $append(dst, 48, buf[2]);
		}
		return dst;
	};
	fmtF = function(dst, neg, d, prec) {
		var i, x, i$1, ch, j, x$1;
		if (neg) {
			dst = $append(dst, 45);
		}
		if (d.dp > 0) {
			i = 0;
			i = 0;
			while (i < d.dp && i < d.nd) {
				dst = $append(dst, (x = d.d, ((i < 0 || i >= x.length) ? $throwRuntimeError("index out of range") : x.array[x.offset + i])));
				i = i + 1 >> 0;
			}
			while (i < d.dp) {
				dst = $append(dst, 48);
				i = i + 1 >> 0;
			}
		} else {
			dst = $append(dst, 48);
		}
		if (prec > 0) {
			dst = $append(dst, 46);
			i$1 = 0;
			while (i$1 < prec) {
				ch = 48;
				j = d.dp + i$1 >> 0;
				if (0 <= j && j < d.nd) {
					ch = (x$1 = d.d, ((j < 0 || j >= x$1.length) ? $throwRuntimeError("index out of range") : x$1.array[x$1.offset + j]));
				}
				dst = $append(dst, ch);
				i$1 = i$1 + 1 >> 0;
			}
		}
		return dst;
	};
	fmtB = function(dst, neg, mant, exp, flt) {
		var buf, w, esign, n, _r, _q, x;
		buf = $makeNativeArray("Uint8", 50, function() { return 0; });
		w = 50;
		exp = exp - ((flt.mantbits >> 0)) >> 0;
		esign = 43;
		if (exp < 0) {
			esign = 45;
			exp = -exp;
		}
		n = 0;
		while (exp > 0 || n < 1) {
			n = n + 1 >> 0;
			w = w - 1 >> 0;
			buf[w] = (((_r = exp % 10, _r === _r ? _r : $throwRuntimeError("integer divide by zero")) + 48 >> 0) << 24 >>> 24);
			exp = (_q = exp / 10, (_q === _q && _q !== 1/0 && _q !== -1/0) ? _q >> 0 : $throwRuntimeError("integer divide by zero"));
		}
		w = w - 1 >> 0;
		buf[w] = esign;
		w = w - 1 >> 0;
		buf[w] = 112;
		n = 0;
		while ((mant.high > 0 || (mant.high === 0 && mant.low > 0)) || n < 1) {
			n = n + 1 >> 0;
			w = w - 1 >> 0;
			buf[w] = ((x = $div64(mant, new $Uint64(0, 10), true), new $Uint64(x.high + 0, x.low + 48)).low << 24 >>> 24);
			mant = $div64(mant, new $Uint64(0, 10), false);
		}
		if (neg) {
			w = w - 1 >> 0;
			buf[w] = 45;
		}
		return $appendSlice(dst, $subslice(new ($sliceType($Uint8))(buf), w));
	};
	max = function(a, b) {
		if (a > b) {
			return a;
		}
		return b;
	};
	FormatInt = $pkg.FormatInt = function(i, base) {
		var _tuple, s;
		_tuple = formatBits(($sliceType($Uint8)).nil, new $Uint64(i.high, i.low), base, (i.high < 0 || (i.high === 0 && i.low < 0)), false); s = _tuple[1];
		return s;
	};
	Itoa = $pkg.Itoa = function(i) {
		return FormatInt(new $Int64(0, i), 10);
	};
	formatBits = function(dst, u, base, neg, append_) {
		var d, s, a, i, q, x, j, q$1, x$1, s$1, b, m, b$1;
		d = ($sliceType($Uint8)).nil;
		s = "";
		if (base < 2 || base > 36) {
			throw $panic(new $String("strconv: illegal AppendInt/FormatInt base"));
		}
		a = $makeNativeArray("Uint8", 65, function() { return 0; });
		i = 65;
		if (neg) {
			u = new $Uint64(-u.high, -u.low);
		}
		if (base === 10) {
			while ((u.high > 0 || (u.high === 0 && u.low >= 100))) {
				i = i - 2 >> 0;
				q = $div64(u, new $Uint64(0, 100), false);
				j = ((x = $mul64(q, new $Uint64(0, 100)), new $Uint64(u.high - x.high, u.low - x.low)).low >>> 0);
				a[(i + 1 >> 0)] = "0123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789".charCodeAt(j);
				a[(i + 0 >> 0)] = "0000000000111111111122222222223333333333444444444455555555556666666666777777777788888888889999999999".charCodeAt(j);
				u = q;
			}
			if ((u.high > 0 || (u.high === 0 && u.low >= 10))) {
				i = i - 1 >> 0;
				q$1 = $div64(u, new $Uint64(0, 10), false);
				a[i] = "0123456789abcdefghijklmnopqrstuvwxyz".charCodeAt(((x$1 = $mul64(q$1, new $Uint64(0, 10)), new $Uint64(u.high - x$1.high, u.low - x$1.low)).low >>> 0));
				u = q$1;
			}
		} else {
			s$1 = shifts[base];
			if (s$1 > 0) {
				b = new $Uint64(0, base);
				m = (b.low >>> 0) - 1 >>> 0;
				while ((u.high > b.high || (u.high === b.high && u.low >= b.low))) {
					i = i - 1 >> 0;
					a[i] = "0123456789abcdefghijklmnopqrstuvwxyz".charCodeAt((((u.low >>> 0) & m) >>> 0));
					u = $shiftRightUint64(u, (s$1));
				}
			} else {
				b$1 = new $Uint64(0, base);
				while ((u.high > b$1.high || (u.high === b$1.high && u.low >= b$1.low))) {
					i = i - 1 >> 0;
					a[i] = "0123456789abcdefghijklmnopqrstuvwxyz".charCodeAt(($div64(u, b$1, true).low >>> 0));
					u = $div64(u, (b$1), false);
				}
			}
		}
		i = i - 1 >> 0;
		a[i] = "0123456789abcdefghijklmnopqrstuvwxyz".charCodeAt((u.low >>> 0));
		if (neg) {
			i = i - 1 >> 0;
			a[i] = 45;
		}
		if (append_) {
			d = $appendSlice(dst, $subslice(new ($sliceType($Uint8))(a), i));
			return [d, s];
		}
		s = $bytesToString($subslice(new ($sliceType($Uint8))(a), i));
		return [d, s];
	};
	quoteWith = function(s, quote, ASCIIonly) {
		var runeTmp, _q, x, buf, width, r, _tuple, n, _ref, s$1, s$2;
		runeTmp = $makeNativeArray("Uint8", 4, function() { return 0; });
		buf = ($sliceType($Uint8)).make(0, (_q = (x = s.length, (((3 >>> 16 << 16) * x >> 0) + (3 << 16 >>> 16) * x) >> 0) / 2, (_q === _q && _q !== 1/0 && _q !== -1/0) ? _q >> 0 : $throwRuntimeError("integer divide by zero")), function() { return 0; });
		buf = $append(buf, quote);
		width = 0;
		while (s.length > 0) {
			r = (s.charCodeAt(0) >> 0);
			width = 1;
			if (r >= 128) {
				_tuple = utf8.DecodeRuneInString(s); r = _tuple[0]; width = _tuple[1];
			}
			if ((width === 1) && (r === 65533)) {
				buf = $appendSlice(buf, new ($sliceType($Uint8))($stringToBytes("\\x")));
				buf = $append(buf, "0123456789abcdef".charCodeAt((s.charCodeAt(0) >>> 4 << 24 >>> 24)));
				buf = $append(buf, "0123456789abcdef".charCodeAt(((s.charCodeAt(0) & 15) >>> 0)));
				s = s.substring(width);
				continue;
			}
			if ((r === (quote >> 0)) || (r === 92)) {
				buf = $append(buf, 92);
				buf = $append(buf, (r << 24 >>> 24));
				s = s.substring(width);
				continue;
			}
			if (ASCIIonly) {
				if (r < 128 && IsPrint(r)) {
					buf = $append(buf, (r << 24 >>> 24));
					s = s.substring(width);
					continue;
				}
			} else if (IsPrint(r)) {
				n = utf8.EncodeRune(new ($sliceType($Uint8))(runeTmp), r);
				buf = $appendSlice(buf, $subslice(new ($sliceType($Uint8))(runeTmp), 0, n));
				s = s.substring(width);
				continue;
			}
			_ref = r;
			if (_ref === 7) {
				buf = $appendSlice(buf, new ($sliceType($Uint8))($stringToBytes("\\a")));
			} else if (_ref === 8) {
				buf = $appendSlice(buf, new ($sliceType($Uint8))($stringToBytes("\\b")));
			} else if (_ref === 12) {
				buf = $appendSlice(buf, new ($sliceType($Uint8))($stringToBytes("\\f")));
			} else if (_ref === 10) {
				buf = $appendSlice(buf, new ($sliceType($Uint8))($stringToBytes("\\n")));
			} else if (_ref === 13) {
				buf = $appendSlice(buf, new ($sliceType($Uint8))($stringToBytes("\\r")));
			} else if (_ref === 9) {
				buf = $appendSlice(buf, new ($sliceType($Uint8))($stringToBytes("\\t")));
			} else if (_ref === 11) {
				buf = $appendSlice(buf, new ($sliceType($Uint8))($stringToBytes("\\v")));
			} else {
				if (r < 32) {
					buf = $appendSlice(buf, new ($sliceType($Uint8))($stringToBytes("\\x")));
					buf = $append(buf, "0123456789abcdef".charCodeAt((s.charCodeAt(0) >>> 4 << 24 >>> 24)));
					buf = $append(buf, "0123456789abcdef".charCodeAt(((s.charCodeAt(0) & 15) >>> 0)));
				} else if (r > 1114111) {
					r = 65533;
					buf = $appendSlice(buf, new ($sliceType($Uint8))($stringToBytes("\\u")));
					s$1 = 12;
					while (s$1 >= 0) {
						buf = $append(buf, "0123456789abcdef".charCodeAt((((r >> $min((s$1 >>> 0), 31)) >> 0) & 15)));
						s$1 = s$1 - 4 >> 0;
					}
				} else if (r < 65536) {
					buf = $appendSlice(buf, new ($sliceType($Uint8))($stringToBytes("\\u")));
					s$1 = 12;
					while (s$1 >= 0) {
						buf = $append(buf, "0123456789abcdef".charCodeAt((((r >> $min((s$1 >>> 0), 31)) >> 0) & 15)));
						s$1 = s$1 - 4 >> 0;
					}
				} else {
					buf = $appendSlice(buf, new ($sliceType($Uint8))($stringToBytes("\\U")));
					s$2 = 28;
					while (s$2 >= 0) {
						buf = $append(buf, "0123456789abcdef".charCodeAt((((r >> $min((s$2 >>> 0), 31)) >> 0) & 15)));
						s$2 = s$2 - 4 >> 0;
					}
				}
			}
			s = s.substring(width);
		}
		buf = $append(buf, quote);
		return $bytesToString(buf);
	};
	Quote = $pkg.Quote = function(s) {
		return quoteWith(s, 34, false);
	};
	QuoteToASCII = $pkg.QuoteToASCII = function(s) {
		return quoteWith(s, 34, true);
	};
	QuoteRune = $pkg.QuoteRune = function(r) {
		return quoteWith($encodeRune(r), 39, false);
	};
	AppendQuoteRune = $pkg.AppendQuoteRune = function(dst, r) {
		return $appendSlice(dst, new ($sliceType($Uint8))($stringToBytes(QuoteRune(r))));
	};
	QuoteRuneToASCII = $pkg.QuoteRuneToASCII = function(r) {
		return quoteWith($encodeRune(r), 39, true);
	};
	AppendQuoteRuneToASCII = $pkg.AppendQuoteRuneToASCII = function(dst, r) {
		return $appendSlice(dst, new ($sliceType($Uint8))($stringToBytes(QuoteRuneToASCII(r))));
	};
	CanBackquote = $pkg.CanBackquote = function(s) {
		var i;
		i = 0;
		while (i < s.length) {
			if ((s.charCodeAt(i) < 32 && !((s.charCodeAt(i) === 9))) || (s.charCodeAt(i) === 96)) {
				return false;
			}
			i = i + 1 >> 0;
		}
		return true;
	};
	unhex = function(b) {
		var v, ok, c, _tmp, _tmp$1, _tmp$2, _tmp$3, _tmp$4, _tmp$5;
		v = 0;
		ok = false;
		c = (b >> 0);
		if (48 <= c && c <= 57) {
			_tmp = c - 48 >> 0; _tmp$1 = true; v = _tmp; ok = _tmp$1;
			return [v, ok];
		} else if (97 <= c && c <= 102) {
			_tmp$2 = (c - 97 >> 0) + 10 >> 0; _tmp$3 = true; v = _tmp$2; ok = _tmp$3;
			return [v, ok];
		} else if (65 <= c && c <= 70) {
			_tmp$4 = (c - 65 >> 0) + 10 >> 0; _tmp$5 = true; v = _tmp$4; ok = _tmp$5;
			return [v, ok];
		}
		return [v, ok];
	};
	UnquoteChar = $pkg.UnquoteChar = function(s, quote) {
		var value, multibyte, tail, err, c, _tuple, r, size, _tmp, _tmp$1, _tmp$2, _tmp$3, _tmp$4, _tmp$5, _tmp$6, _tmp$7, c$1, _ref, n, _ref$1, v, j, _tuple$1, x, ok, v$1, j$1, x$1;
		value = 0;
		multibyte = false;
		tail = "";
		err = null;
		c = s.charCodeAt(0);
		if ((c === quote) && ((quote === 39) || (quote === 34))) {
			err = $pkg.ErrSyntax;
			return [value, multibyte, tail, err];
		} else if (c >= 128) {
			_tuple = utf8.DecodeRuneInString(s); r = _tuple[0]; size = _tuple[1];
			_tmp = r; _tmp$1 = true; _tmp$2 = s.substring(size); _tmp$3 = null; value = _tmp; multibyte = _tmp$1; tail = _tmp$2; err = _tmp$3;
			return [value, multibyte, tail, err];
		} else if (!((c === 92))) {
			_tmp$4 = (s.charCodeAt(0) >> 0); _tmp$5 = false; _tmp$6 = s.substring(1); _tmp$7 = null; value = _tmp$4; multibyte = _tmp$5; tail = _tmp$6; err = _tmp$7;
			return [value, multibyte, tail, err];
		}
		if (s.length <= 1) {
			err = $pkg.ErrSyntax;
			return [value, multibyte, tail, err];
		}
		c$1 = s.charCodeAt(1);
		s = s.substring(2);
		_ref = c$1;
		switch (0) { default: if (_ref === 97) {
			value = 7;
		} else if (_ref === 98) {
			value = 8;
		} else if (_ref === 102) {
			value = 12;
		} else if (_ref === 110) {
			value = 10;
		} else if (_ref === 114) {
			value = 13;
		} else if (_ref === 116) {
			value = 9;
		} else if (_ref === 118) {
			value = 11;
		} else if (_ref === 120 || _ref === 117 || _ref === 85) {
			n = 0;
			_ref$1 = c$1;
			if (_ref$1 === 120) {
				n = 2;
			} else if (_ref$1 === 117) {
				n = 4;
			} else if (_ref$1 === 85) {
				n = 8;
			}
			v = 0;
			if (s.length < n) {
				err = $pkg.ErrSyntax;
				return [value, multibyte, tail, err];
			}
			j = 0;
			while (j < n) {
				_tuple$1 = unhex(s.charCodeAt(j)); x = _tuple$1[0]; ok = _tuple$1[1];
				if (!ok) {
					err = $pkg.ErrSyntax;
					return [value, multibyte, tail, err];
				}
				v = (v << 4 >> 0) | x;
				j = j + 1 >> 0;
			}
			s = s.substring(n);
			if (c$1 === 120) {
				value = v;
				break;
			}
			if (v > 1114111) {
				err = $pkg.ErrSyntax;
				return [value, multibyte, tail, err];
			}
			value = v;
			multibyte = true;
		} else if (_ref === 48 || _ref === 49 || _ref === 50 || _ref === 51 || _ref === 52 || _ref === 53 || _ref === 54 || _ref === 55) {
			v$1 = (c$1 >> 0) - 48 >> 0;
			if (s.length < 2) {
				err = $pkg.ErrSyntax;
				return [value, multibyte, tail, err];
			}
			j$1 = 0;
			while (j$1 < 2) {
				x$1 = (s.charCodeAt(j$1) >> 0) - 48 >> 0;
				if (x$1 < 0 || x$1 > 7) {
					err = $pkg.ErrSyntax;
					return [value, multibyte, tail, err];
				}
				v$1 = ((v$1 << 3 >> 0)) | x$1;
				j$1 = j$1 + 1 >> 0;
			}
			s = s.substring(2);
			if (v$1 > 255) {
				err = $pkg.ErrSyntax;
				return [value, multibyte, tail, err];
			}
			value = v$1;
		} else if (_ref === 92) {
			value = 92;
		} else if (_ref === 39 || _ref === 34) {
			if (!((c$1 === quote))) {
				err = $pkg.ErrSyntax;
				return [value, multibyte, tail, err];
			}
			value = (c$1 >> 0);
		} else {
			err = $pkg.ErrSyntax;
			return [value, multibyte, tail, err];
		} }
		tail = s;
		return [value, multibyte, tail, err];
	};
	Unquote = $pkg.Unquote = function(s) {
		var t, err, n, _tmp, _tmp$1, quote, _tmp$2, _tmp$3, _tmp$4, _tmp$5, _tmp$6, _tmp$7, _tmp$8, _tmp$9, _tmp$10, _tmp$11, _ref, _tmp$12, _tmp$13, _tuple, r, size, _tmp$14, _tmp$15, runeTmp, _q, x, buf, _tuple$1, c, multibyte, ss, err$1, _tmp$16, _tmp$17, n$1, _tmp$18, _tmp$19, _tmp$20, _tmp$21;
		t = "";
		err = null;
		n = s.length;
		if (n < 2) {
			_tmp = ""; _tmp$1 = $pkg.ErrSyntax; t = _tmp; err = _tmp$1;
			return [t, err];
		}
		quote = s.charCodeAt(0);
		if (!((quote === s.charCodeAt((n - 1 >> 0))))) {
			_tmp$2 = ""; _tmp$3 = $pkg.ErrSyntax; t = _tmp$2; err = _tmp$3;
			return [t, err];
		}
		s = s.substring(1, (n - 1 >> 0));
		if (quote === 96) {
			if (contains(s, 96)) {
				_tmp$4 = ""; _tmp$5 = $pkg.ErrSyntax; t = _tmp$4; err = _tmp$5;
				return [t, err];
			}
			_tmp$6 = s; _tmp$7 = null; t = _tmp$6; err = _tmp$7;
			return [t, err];
		}
		if (!((quote === 34)) && !((quote === 39))) {
			_tmp$8 = ""; _tmp$9 = $pkg.ErrSyntax; t = _tmp$8; err = _tmp$9;
			return [t, err];
		}
		if (contains(s, 10)) {
			_tmp$10 = ""; _tmp$11 = $pkg.ErrSyntax; t = _tmp$10; err = _tmp$11;
			return [t, err];
		}
		if (!contains(s, 92) && !contains(s, quote)) {
			_ref = quote;
			if (_ref === 34) {
				_tmp$12 = s; _tmp$13 = null; t = _tmp$12; err = _tmp$13;
				return [t, err];
			} else if (_ref === 39) {
				_tuple = utf8.DecodeRuneInString(s); r = _tuple[0]; size = _tuple[1];
				if ((size === s.length) && (!((r === 65533)) || !((size === 1)))) {
					_tmp$14 = s; _tmp$15 = null; t = _tmp$14; err = _tmp$15;
					return [t, err];
				}
			}
		}
		runeTmp = $makeNativeArray("Uint8", 4, function() { return 0; });
		buf = ($sliceType($Uint8)).make(0, (_q = (x = s.length, (((3 >>> 16 << 16) * x >> 0) + (3 << 16 >>> 16) * x) >> 0) / 2, (_q === _q && _q !== 1/0 && _q !== -1/0) ? _q >> 0 : $throwRuntimeError("integer divide by zero")), function() { return 0; });
		while (s.length > 0) {
			_tuple$1 = UnquoteChar(s, quote); c = _tuple$1[0]; multibyte = _tuple$1[1]; ss = _tuple$1[2]; err$1 = _tuple$1[3];
			if (!($interfaceIsEqual(err$1, null))) {
				_tmp$16 = ""; _tmp$17 = err$1; t = _tmp$16; err = _tmp$17;
				return [t, err];
			}
			s = ss;
			if (c < 128 || !multibyte) {
				buf = $append(buf, (c << 24 >>> 24));
			} else {
				n$1 = utf8.EncodeRune(new ($sliceType($Uint8))(runeTmp), c);
				buf = $appendSlice(buf, $subslice(new ($sliceType($Uint8))(runeTmp), 0, n$1));
			}
			if ((quote === 39) && !((s.length === 0))) {
				_tmp$18 = ""; _tmp$19 = $pkg.ErrSyntax; t = _tmp$18; err = _tmp$19;
				return [t, err];
			}
		}
		_tmp$20 = $bytesToString(buf); _tmp$21 = null; t = _tmp$20; err = _tmp$21;
		return [t, err];
	};
	contains = function(s, c) {
		var i;
		i = 0;
		while (i < s.length) {
			if (s.charCodeAt(i) === c) {
				return true;
			}
			i = i + 1 >> 0;
		}
		return false;
	};
	bsearch16 = function(a, x) {
		var _tmp, _tmp$1, i, j, _q, h;
		_tmp = 0; _tmp$1 = a.length; i = _tmp; j = _tmp$1;
		while (i < j) {
			h = i + (_q = ((j - i >> 0)) / 2, (_q === _q && _q !== 1/0 && _q !== -1/0) ? _q >> 0 : $throwRuntimeError("integer divide by zero")) >> 0;
			if (((h < 0 || h >= a.length) ? $throwRuntimeError("index out of range") : a.array[a.offset + h]) < x) {
				i = h + 1 >> 0;
			} else {
				j = h;
			}
		}
		return i;
	};
	bsearch32 = function(a, x) {
		var _tmp, _tmp$1, i, j, _q, h;
		_tmp = 0; _tmp$1 = a.length; i = _tmp; j = _tmp$1;
		while (i < j) {
			h = i + (_q = ((j - i >> 0)) / 2, (_q === _q && _q !== 1/0 && _q !== -1/0) ? _q >> 0 : $throwRuntimeError("integer divide by zero")) >> 0;
			if (((h < 0 || h >= a.length) ? $throwRuntimeError("index out of range") : a.array[a.offset + h]) < x) {
				i = h + 1 >> 0;
			} else {
				j = h;
			}
		}
		return i;
	};
	IsPrint = $pkg.IsPrint = function(r) {
		var _tmp, _tmp$1, _tmp$2, rr, isPrint, isNotPrint, i, x, x$1, j, _tmp$3, _tmp$4, _tmp$5, rr$1, isPrint$1, isNotPrint$1, i$1, x$2, x$3, j$1;
		if (r <= 255) {
			if (32 <= r && r <= 126) {
				return true;
			}
			if (161 <= r && r <= 255) {
				return !((r === 173));
			}
			return false;
		}
		if (0 <= r && r < 65536) {
			_tmp = (r << 16 >>> 16); _tmp$1 = isPrint16; _tmp$2 = isNotPrint16; rr = _tmp; isPrint = _tmp$1; isNotPrint = _tmp$2;
			i = bsearch16(isPrint, rr);
			if (i >= isPrint.length || rr < (x = i & ~1, ((x < 0 || x >= isPrint.length) ? $throwRuntimeError("index out of range") : isPrint.array[isPrint.offset + x])) || (x$1 = i | 1, ((x$1 < 0 || x$1 >= isPrint.length) ? $throwRuntimeError("index out of range") : isPrint.array[isPrint.offset + x$1])) < rr) {
				return false;
			}
			j = bsearch16(isNotPrint, rr);
			return j >= isNotPrint.length || !((((j < 0 || j >= isNotPrint.length) ? $throwRuntimeError("index out of range") : isNotPrint.array[isNotPrint.offset + j]) === rr));
		}
		_tmp$3 = (r >>> 0); _tmp$4 = isPrint32; _tmp$5 = isNotPrint32; rr$1 = _tmp$3; isPrint$1 = _tmp$4; isNotPrint$1 = _tmp$5;
		i$1 = bsearch32(isPrint$1, rr$1);
		if (i$1 >= isPrint$1.length || rr$1 < (x$2 = i$1 & ~1, ((x$2 < 0 || x$2 >= isPrint$1.length) ? $throwRuntimeError("index out of range") : isPrint$1.array[isPrint$1.offset + x$2])) || (x$3 = i$1 | 1, ((x$3 < 0 || x$3 >= isPrint$1.length) ? $throwRuntimeError("index out of range") : isPrint$1.array[isPrint$1.offset + x$3])) < rr$1) {
			return false;
		}
		if (r >= 131072) {
			return true;
		}
		r = r - 65536 >> 0;
		j$1 = bsearch16(isNotPrint$1, (r << 16 >>> 16));
		return j$1 >= isNotPrint$1.length || !((((j$1 < 0 || j$1 >= isNotPrint$1.length) ? $throwRuntimeError("index out of range") : isNotPrint$1.array[isNotPrint$1.offset + j$1]) === (r << 16 >>> 16)));
	};
	$pkg.init = function() {
		($ptrType(NumError)).methods = [["Error", "Error", "", [], [$String], false, -1]];
		NumError.init([["Func", "Func", "", $String, ""], ["Num", "Num", "", $String, ""], ["Err", "Err", "", $error, ""]]);
		($ptrType(decimal)).methods = [["Assign", "Assign", "", [$Uint64], [], false, -1], ["Round", "Round", "", [$Int], [], false, -1], ["RoundDown", "RoundDown", "", [$Int], [], false, -1], ["RoundUp", "RoundUp", "", [$Int], [], false, -1], ["RoundedInteger", "RoundedInteger", "", [], [$Uint64], false, -1], ["Shift", "Shift", "", [$Int], [], false, -1], ["String", "String", "", [], [$String], false, -1], ["atof32int", "atof32int", "strconv", [], [$Float32], false, -1], ["floatBits", "floatBits", "strconv", [($ptrType(floatInfo))], [$Uint64, $Bool], false, -1], ["set", "set", "strconv", [$String], [$Bool], false, -1]];
		decimal.init([["d", "d", "strconv", ($arrayType($Uint8, 800)), ""], ["nd", "nd", "strconv", $Int, ""], ["dp", "dp", "strconv", $Int, ""], ["neg", "neg", "strconv", $Bool, ""], ["trunc", "trunc", "strconv", $Bool, ""]]);
		leftCheat.init([["delta", "delta", "strconv", $Int, ""], ["cutoff", "cutoff", "strconv", $String, ""]]);
		($ptrType(extFloat)).methods = [["AssignComputeBounds", "AssignComputeBounds", "", [$Uint64, $Int, $Bool, ($ptrType(floatInfo))], [extFloat, extFloat], false, -1], ["AssignDecimal", "AssignDecimal", "", [$Uint64, $Int, $Bool, $Bool, ($ptrType(floatInfo))], [$Bool], false, -1], ["FixedDecimal", "FixedDecimal", "", [($ptrType(decimalSlice)), $Int], [$Bool], false, -1], ["Multiply", "Multiply", "", [extFloat], [], false, -1], ["Normalize", "Normalize", "", [], [$Uint], false, -1], ["ShortestDecimal", "ShortestDecimal", "", [($ptrType(decimalSlice)), ($ptrType(extFloat)), ($ptrType(extFloat))], [$Bool], false, -1], ["floatBits", "floatBits", "strconv", [($ptrType(floatInfo))], [$Uint64, $Bool], false, -1], ["frexp10", "frexp10", "strconv", [], [$Int, $Int], false, -1]];
		extFloat.init([["mant", "mant", "strconv", $Uint64, ""], ["exp", "exp", "strconv", $Int, ""], ["neg", "neg", "strconv", $Bool, ""]]);
		floatInfo.init([["mantbits", "mantbits", "strconv", $Uint, ""], ["expbits", "expbits", "strconv", $Uint, ""], ["bias", "bias", "strconv", $Int, ""]]);
		decimalSlice.init([["d", "d", "strconv", ($sliceType($Uint8)), ""], ["nd", "nd", "strconv", $Int, ""], ["dp", "dp", "strconv", $Int, ""], ["neg", "neg", "strconv", $Bool, ""]]);
		optimize = true;
		powtab = new ($sliceType($Int))([1, 3, 6, 9, 13, 16, 19, 23, 26]);
		float64pow10 = new ($sliceType($Float64))([1, 10, 100, 1000, 10000, 100000, 1e+06, 1e+07, 1e+08, 1e+09, 1e+10, 1e+11, 1e+12, 1e+13, 1e+14, 1e+15, 1e+16, 1e+17, 1e+18, 1e+19, 1e+20, 1e+21, 1e+22]);
		float32pow10 = new ($sliceType($Float32))([1, 10, 100, 1000, 10000, 100000, 1e+06, 1e+07, 1e+08, 1e+09, 1e+10]);
		$pkg.ErrRange = errors.New("value out of range");
		$pkg.ErrSyntax = errors.New("invalid syntax");
		leftcheats = new ($sliceType(leftCheat))([new leftCheat.Ptr(0, ""), new leftCheat.Ptr(1, "5"), new leftCheat.Ptr(1, "25"), new leftCheat.Ptr(1, "125"), new leftCheat.Ptr(2, "625"), new leftCheat.Ptr(2, "3125"), new leftCheat.Ptr(2, "15625"), new leftCheat.Ptr(3, "78125"), new leftCheat.Ptr(3, "390625"), new leftCheat.Ptr(3, "1953125"), new leftCheat.Ptr(4, "9765625"), new leftCheat.Ptr(4, "48828125"), new leftCheat.Ptr(4, "244140625"), new leftCheat.Ptr(4, "1220703125"), new leftCheat.Ptr(5, "6103515625"), new leftCheat.Ptr(5, "30517578125"), new leftCheat.Ptr(5, "152587890625"), new leftCheat.Ptr(6, "762939453125"), new leftCheat.Ptr(6, "3814697265625"), new leftCheat.Ptr(6, "19073486328125"), new leftCheat.Ptr(7, "95367431640625"), new leftCheat.Ptr(7, "476837158203125"), new leftCheat.Ptr(7, "2384185791015625"), new leftCheat.Ptr(7, "11920928955078125"), new leftCheat.Ptr(8, "59604644775390625"), new leftCheat.Ptr(8, "298023223876953125"), new leftCheat.Ptr(8, "1490116119384765625"), new leftCheat.Ptr(9, "7450580596923828125")]);
		smallPowersOfTen = $toNativeArray("Struct", [new extFloat.Ptr(new $Uint64(2147483648, 0), -63, false), new extFloat.Ptr(new $Uint64(2684354560, 0), -60, false), new extFloat.Ptr(new $Uint64(3355443200, 0), -57, false), new extFloat.Ptr(new $Uint64(4194304000, 0), -54, false), new extFloat.Ptr(new $Uint64(2621440000, 0), -50, false), new extFloat.Ptr(new $Uint64(3276800000, 0), -47, false), new extFloat.Ptr(new $Uint64(4096000000, 0), -44, false), new extFloat.Ptr(new $Uint64(2560000000, 0), -40, false)]);
		powersOfTen = $toNativeArray("Struct", [new extFloat.Ptr(new $Uint64(4203730336, 136053384), -1220, false), new extFloat.Ptr(new $Uint64(3132023167, 2722021238), -1193, false), new extFloat.Ptr(new $Uint64(2333539104, 810921078), -1166, false), new extFloat.Ptr(new $Uint64(3477244234, 1573795306), -1140, false), new extFloat.Ptr(new $Uint64(2590748842, 1432697645), -1113, false), new extFloat.Ptr(new $Uint64(3860516611, 1025131999), -1087, false), new extFloat.Ptr(new $Uint64(2876309015, 3348809418), -1060, false), new extFloat.Ptr(new $Uint64(4286034428, 3200048207), -1034, false), new extFloat.Ptr(new $Uint64(3193344495, 1097586188), -1007, false), new extFloat.Ptr(new $Uint64(2379227053, 2424306748), -980, false), new extFloat.Ptr(new $Uint64(3545324584, 827693699), -954, false), new extFloat.Ptr(new $Uint64(2641472655, 2913388981), -927, false), new extFloat.Ptr(new $Uint64(3936100983, 602835915), -901, false), new extFloat.Ptr(new $Uint64(2932623761, 1081627501), -874, false), new extFloat.Ptr(new $Uint64(2184974969, 1572261463), -847, false), new extFloat.Ptr(new $Uint64(3255866422, 1308317239), -821, false), new extFloat.Ptr(new $Uint64(2425809519, 944281679), -794, false), new extFloat.Ptr(new $Uint64(3614737867, 629291719), -768, false), new extFloat.Ptr(new $Uint64(2693189581, 2545915892), -741, false), new extFloat.Ptr(new $Uint64(4013165208, 388672741), -715, false), new extFloat.Ptr(new $Uint64(2990041083, 708162190), -688, false), new extFloat.Ptr(new $Uint64(2227754207, 3536207675), -661, false), new extFloat.Ptr(new $Uint64(3319612455, 450088378), -635, false), new extFloat.Ptr(new $Uint64(2473304014, 3139815830), -608, false), new extFloat.Ptr(new $Uint64(3685510180, 2103616900), -582, false), new extFloat.Ptr(new $Uint64(2745919064, 224385782), -555, false), new extFloat.Ptr(new $Uint64(4091738259, 3737383206), -529, false), new extFloat.Ptr(new $Uint64(3048582568, 2868871352), -502, false), new extFloat.Ptr(new $Uint64(2271371013, 1820084875), -475, false), new extFloat.Ptr(new $Uint64(3384606560, 885076051), -449, false), new extFloat.Ptr(new $Uint64(2521728396, 2444895829), -422, false), new extFloat.Ptr(new $Uint64(3757668132, 1881767613), -396, false), new extFloat.Ptr(new $Uint64(2799680927, 3102062735), -369, false), new extFloat.Ptr(new $Uint64(4171849679, 2289335700), -343, false), new extFloat.Ptr(new $Uint64(3108270227, 2410191823), -316, false), new extFloat.Ptr(new $Uint64(2315841784, 3205436779), -289, false), new extFloat.Ptr(new $Uint64(3450873173, 1697722806), -263, false), new extFloat.Ptr(new $Uint64(2571100870, 3497754540), -236, false), new extFloat.Ptr(new $Uint64(3831238852, 707476230), -210, false), new extFloat.Ptr(new $Uint64(2854495385, 1769181907), -183, false), new extFloat.Ptr(new $Uint64(4253529586, 2197867022), -157, false), new extFloat.Ptr(new $Uint64(3169126500, 2450594539), -130, false), new extFloat.Ptr(new $Uint64(2361183241, 1867548876), -103, false), new extFloat.Ptr(new $Uint64(3518437208, 3793315116), -77, false), new extFloat.Ptr(new $Uint64(2621440000, 0), -50, false), new extFloat.Ptr(new $Uint64(3906250000, 0), -24, false), new extFloat.Ptr(new $Uint64(2910383045, 2892103680), 3, false), new extFloat.Ptr(new $Uint64(2168404344, 4170451332), 30, false), new extFloat.Ptr(new $Uint64(3231174267, 3372684723), 56, false), new extFloat.Ptr(new $Uint64(2407412430, 2078956656), 83, false), new extFloat.Ptr(new $Uint64(3587324068, 2884206696), 109, false), new extFloat.Ptr(new $Uint64(2672764710, 395977285), 136, false), new extFloat.Ptr(new $Uint64(3982729777, 3569679143), 162, false), new extFloat.Ptr(new $Uint64(2967364920, 2361961896), 189, false), new extFloat.Ptr(new $Uint64(2210859150, 447440347), 216, false), new extFloat.Ptr(new $Uint64(3294436857, 1114709402), 242, false), new extFloat.Ptr(new $Uint64(2454546732, 2786846552), 269, false), new extFloat.Ptr(new $Uint64(3657559652, 443583978), 295, false), new extFloat.Ptr(new $Uint64(2725094297, 2599384906), 322, false), new extFloat.Ptr(new $Uint64(4060706939, 3028118405), 348, false), new extFloat.Ptr(new $Uint64(3025462433, 2044532855), 375, false), new extFloat.Ptr(new $Uint64(2254145170, 1536935362), 402, false), new extFloat.Ptr(new $Uint64(3358938053, 3365297469), 428, false), new extFloat.Ptr(new $Uint64(2502603868, 4204241075), 455, false), new extFloat.Ptr(new $Uint64(3729170365, 2577424355), 481, false), new extFloat.Ptr(new $Uint64(2778448436, 3677981733), 508, false), new extFloat.Ptr(new $Uint64(4140210802, 2744688476), 534, false), new extFloat.Ptr(new $Uint64(3084697427, 1424604878), 561, false), new extFloat.Ptr(new $Uint64(2298278679, 4062331362), 588, false), new extFloat.Ptr(new $Uint64(3424702107, 3546052773), 614, false), new extFloat.Ptr(new $Uint64(2551601907, 2065781727), 641, false), new extFloat.Ptr(new $Uint64(3802183132, 2535403578), 667, false), new extFloat.Ptr(new $Uint64(2832847187, 1558426518), 694, false), new extFloat.Ptr(new $Uint64(4221271257, 2762425404), 720, false), new extFloat.Ptr(new $Uint64(3145092172, 2812560400), 747, false), new extFloat.Ptr(new $Uint64(2343276271, 3057687578), 774, false), new extFloat.Ptr(new $Uint64(3491753744, 2790753324), 800, false), new extFloat.Ptr(new $Uint64(2601559269, 3918606633), 827, false), new extFloat.Ptr(new $Uint64(3876625403, 2711358621), 853, false), new extFloat.Ptr(new $Uint64(2888311001, 1648096297), 880, false), new extFloat.Ptr(new $Uint64(2151959390, 2057817989), 907, false), new extFloat.Ptr(new $Uint64(3206669376, 61660461), 933, false), new extFloat.Ptr(new $Uint64(2389154863, 1581580175), 960, false), new extFloat.Ptr(new $Uint64(3560118173, 2626467905), 986, false), new extFloat.Ptr(new $Uint64(2652494738, 3034782633), 1013, false), new extFloat.Ptr(new $Uint64(3952525166, 3135207385), 1039, false), new extFloat.Ptr(new $Uint64(2944860731, 2616258155), 1066, false)]);
		uint64pow10 = $toNativeArray("Uint64", [new $Uint64(0, 1), new $Uint64(0, 10), new $Uint64(0, 100), new $Uint64(0, 1000), new $Uint64(0, 10000), new $Uint64(0, 100000), new $Uint64(0, 1000000), new $Uint64(0, 10000000), new $Uint64(0, 100000000), new $Uint64(0, 1000000000), new $Uint64(2, 1410065408), new $Uint64(23, 1215752192), new $Uint64(232, 3567587328), new $Uint64(2328, 1316134912), new $Uint64(23283, 276447232), new $Uint64(232830, 2764472320), new $Uint64(2328306, 1874919424), new $Uint64(23283064, 1569325056), new $Uint64(232830643, 2808348672), new $Uint64(2328306436, 2313682944)]);
		float32info = new floatInfo.Ptr(23, 8, -127);
		float64info = new floatInfo.Ptr(52, 11, -1023);
		isPrint16 = new ($sliceType($Uint16))([32, 126, 161, 887, 890, 894, 900, 1319, 1329, 1366, 1369, 1418, 1423, 1479, 1488, 1514, 1520, 1524, 1542, 1563, 1566, 1805, 1808, 1866, 1869, 1969, 1984, 2042, 2048, 2093, 2096, 2139, 2142, 2142, 2208, 2220, 2276, 2444, 2447, 2448, 2451, 2482, 2486, 2489, 2492, 2500, 2503, 2504, 2507, 2510, 2519, 2519, 2524, 2531, 2534, 2555, 2561, 2570, 2575, 2576, 2579, 2617, 2620, 2626, 2631, 2632, 2635, 2637, 2641, 2641, 2649, 2654, 2662, 2677, 2689, 2745, 2748, 2765, 2768, 2768, 2784, 2787, 2790, 2801, 2817, 2828, 2831, 2832, 2835, 2873, 2876, 2884, 2887, 2888, 2891, 2893, 2902, 2903, 2908, 2915, 2918, 2935, 2946, 2954, 2958, 2965, 2969, 2975, 2979, 2980, 2984, 2986, 2990, 3001, 3006, 3010, 3014, 3021, 3024, 3024, 3031, 3031, 3046, 3066, 3073, 3129, 3133, 3149, 3157, 3161, 3168, 3171, 3174, 3183, 3192, 3199, 3202, 3257, 3260, 3277, 3285, 3286, 3294, 3299, 3302, 3314, 3330, 3386, 3389, 3406, 3415, 3415, 3424, 3427, 3430, 3445, 3449, 3455, 3458, 3478, 3482, 3517, 3520, 3526, 3530, 3530, 3535, 3551, 3570, 3572, 3585, 3642, 3647, 3675, 3713, 3716, 3719, 3722, 3725, 3725, 3732, 3751, 3754, 3773, 3776, 3789, 3792, 3801, 3804, 3807, 3840, 3948, 3953, 4058, 4096, 4295, 4301, 4301, 4304, 4685, 4688, 4701, 4704, 4749, 4752, 4789, 4792, 4805, 4808, 4885, 4888, 4954, 4957, 4988, 4992, 5017, 5024, 5108, 5120, 5788, 5792, 5872, 5888, 5908, 5920, 5942, 5952, 5971, 5984, 6003, 6016, 6109, 6112, 6121, 6128, 6137, 6144, 6157, 6160, 6169, 6176, 6263, 6272, 6314, 6320, 6389, 6400, 6428, 6432, 6443, 6448, 6459, 6464, 6464, 6468, 6509, 6512, 6516, 6528, 6571, 6576, 6601, 6608, 6618, 6622, 6683, 6686, 6780, 6783, 6793, 6800, 6809, 6816, 6829, 6912, 6987, 6992, 7036, 7040, 7155, 7164, 7223, 7227, 7241, 7245, 7295, 7360, 7367, 7376, 7414, 7424, 7654, 7676, 7957, 7960, 7965, 7968, 8005, 8008, 8013, 8016, 8061, 8064, 8147, 8150, 8175, 8178, 8190, 8208, 8231, 8240, 8286, 8304, 8305, 8308, 8348, 8352, 8378, 8400, 8432, 8448, 8585, 8592, 9203, 9216, 9254, 9280, 9290, 9312, 11084, 11088, 11097, 11264, 11507, 11513, 11559, 11565, 11565, 11568, 11623, 11631, 11632, 11647, 11670, 11680, 11835, 11904, 12019, 12032, 12245, 12272, 12283, 12289, 12438, 12441, 12543, 12549, 12589, 12593, 12730, 12736, 12771, 12784, 19893, 19904, 40908, 40960, 42124, 42128, 42182, 42192, 42539, 42560, 42647, 42655, 42743, 42752, 42899, 42912, 42922, 43000, 43051, 43056, 43065, 43072, 43127, 43136, 43204, 43214, 43225, 43232, 43259, 43264, 43347, 43359, 43388, 43392, 43481, 43486, 43487, 43520, 43574, 43584, 43597, 43600, 43609, 43612, 43643, 43648, 43714, 43739, 43766, 43777, 43782, 43785, 43790, 43793, 43798, 43808, 43822, 43968, 44013, 44016, 44025, 44032, 55203, 55216, 55238, 55243, 55291, 63744, 64109, 64112, 64217, 64256, 64262, 64275, 64279, 64285, 64449, 64467, 64831, 64848, 64911, 64914, 64967, 65008, 65021, 65024, 65049, 65056, 65062, 65072, 65131, 65136, 65276, 65281, 65470, 65474, 65479, 65482, 65487, 65490, 65495, 65498, 65500, 65504, 65518, 65532, 65533]);
		isNotPrint16 = new ($sliceType($Uint16))([173, 907, 909, 930, 1376, 1416, 1424, 1757, 2111, 2209, 2303, 2424, 2432, 2436, 2473, 2481, 2526, 2564, 2601, 2609, 2612, 2615, 2621, 2653, 2692, 2702, 2706, 2729, 2737, 2740, 2758, 2762, 2820, 2857, 2865, 2868, 2910, 2948, 2961, 2971, 2973, 3017, 3076, 3085, 3089, 3113, 3124, 3141, 3145, 3159, 3204, 3213, 3217, 3241, 3252, 3269, 3273, 3295, 3312, 3332, 3341, 3345, 3397, 3401, 3460, 3506, 3516, 3541, 3543, 3715, 3721, 3736, 3744, 3748, 3750, 3756, 3770, 3781, 3783, 3912, 3992, 4029, 4045, 4294, 4681, 4695, 4697, 4745, 4785, 4799, 4801, 4823, 4881, 5760, 5901, 5997, 6001, 6751, 8024, 8026, 8028, 8030, 8117, 8133, 8156, 8181, 8335, 9984, 11311, 11359, 11558, 11687, 11695, 11703, 11711, 11719, 11727, 11735, 11743, 11930, 12352, 12687, 12831, 13055, 42895, 43470, 43815, 64311, 64317, 64319, 64322, 64325, 65107, 65127, 65141, 65511]);
		isPrint32 = new ($sliceType($Uint32))([65536, 65613, 65616, 65629, 65664, 65786, 65792, 65794, 65799, 65843, 65847, 65930, 65936, 65947, 66000, 66045, 66176, 66204, 66208, 66256, 66304, 66339, 66352, 66378, 66432, 66499, 66504, 66517, 66560, 66717, 66720, 66729, 67584, 67589, 67592, 67640, 67644, 67644, 67647, 67679, 67840, 67867, 67871, 67897, 67903, 67903, 67968, 68023, 68030, 68031, 68096, 68102, 68108, 68147, 68152, 68154, 68159, 68167, 68176, 68184, 68192, 68223, 68352, 68405, 68409, 68437, 68440, 68466, 68472, 68479, 68608, 68680, 69216, 69246, 69632, 69709, 69714, 69743, 69760, 69825, 69840, 69864, 69872, 69881, 69888, 69955, 70016, 70088, 70096, 70105, 71296, 71351, 71360, 71369, 73728, 74606, 74752, 74850, 74864, 74867, 77824, 78894, 92160, 92728, 93952, 94020, 94032, 94078, 94095, 94111, 110592, 110593, 118784, 119029, 119040, 119078, 119081, 119154, 119163, 119261, 119296, 119365, 119552, 119638, 119648, 119665, 119808, 119967, 119970, 119970, 119973, 119974, 119977, 120074, 120077, 120134, 120138, 120485, 120488, 120779, 120782, 120831, 126464, 126500, 126503, 126523, 126530, 126530, 126535, 126548, 126551, 126564, 126567, 126619, 126625, 126651, 126704, 126705, 126976, 127019, 127024, 127123, 127136, 127150, 127153, 127166, 127169, 127199, 127232, 127242, 127248, 127339, 127344, 127386, 127462, 127490, 127504, 127546, 127552, 127560, 127568, 127569, 127744, 127776, 127792, 127868, 127872, 127891, 127904, 127946, 127968, 127984, 128000, 128252, 128256, 128317, 128320, 128323, 128336, 128359, 128507, 128576, 128581, 128591, 128640, 128709, 128768, 128883, 131072, 173782, 173824, 177972, 177984, 178205, 194560, 195101, 917760, 917999]);
		isNotPrint32 = new ($sliceType($Uint16))([12, 39, 59, 62, 799, 926, 2057, 2102, 2134, 2564, 2580, 2584, 4285, 4405, 54357, 54429, 54445, 54458, 54460, 54468, 54534, 54549, 54557, 54586, 54591, 54597, 54609, 60932, 60960, 60963, 60968, 60979, 60984, 60986, 61000, 61002, 61004, 61008, 61011, 61016, 61018, 61020, 61022, 61024, 61027, 61035, 61043, 61048, 61053, 61055, 61066, 61092, 61098, 61648, 61743, 62262, 62405, 62527, 62529, 62712]);
		shifts = $toNativeArray("Uint", [0, 0, 1, 0, 2, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0]);
	};
	return $pkg;
})();
$packages["strings"] = (function() {
	var $pkg = {}, js = $packages["github.com/gopherjs/gopherjs/js"], errors = $packages["errors"], io = $packages["io"], utf8 = $packages["unicode/utf8"], unicode = $packages["unicode"], IndexByte, hashstr, ContainsRune, Index, IndexRune, Map, EqualFold;
	IndexByte = $pkg.IndexByte = function(s, c) {
		return $parseInt(s.indexOf($global.String.fromCharCode(c))) >> 0;
	};
	hashstr = function(sep) {
		var hash, i, _tmp, _tmp$1, pow, sq, i$1, x, x$1;
		hash = 0;
		i = 0;
		while (i < sep.length) {
			hash = ((((hash >>> 16 << 16) * 16777619 >>> 0) + (hash << 16 >>> 16) * 16777619) >>> 0) + (sep.charCodeAt(i) >>> 0) >>> 0;
			i = i + 1 >> 0;
		}
		_tmp = 1; _tmp$1 = 16777619; pow = _tmp; sq = _tmp$1;
		i$1 = sep.length;
		while (i$1 > 0) {
			if (!(((i$1 & 1) === 0))) {
				pow = (x = sq, (((pow >>> 16 << 16) * x >>> 0) + (pow << 16 >>> 16) * x) >>> 0);
			}
			sq = (x$1 = sq, (((sq >>> 16 << 16) * x$1 >>> 0) + (sq << 16 >>> 16) * x$1) >>> 0);
			i$1 = i$1 >> 1 >> 0;
		}
		return [hash, pow];
	};
	ContainsRune = $pkg.ContainsRune = function(s, r) {
		return IndexRune(s, r) >= 0;
	};
	Index = $pkg.Index = function(s, sep) {
		var n, _tuple, hashsep, pow, h, i, i$1, x;
		n = sep.length;
		if (n === 0) {
			return 0;
		} else if (n === 1) {
			return IndexByte(s, sep.charCodeAt(0));
		} else if (n === s.length) {
			if (sep === s) {
				return 0;
			}
			return -1;
		} else if (n > s.length) {
			return -1;
		}
		_tuple = hashstr(sep); hashsep = _tuple[0]; pow = _tuple[1];
		h = 0;
		i = 0;
		while (i < n) {
			h = ((((h >>> 16 << 16) * 16777619 >>> 0) + (h << 16 >>> 16) * 16777619) >>> 0) + (s.charCodeAt(i) >>> 0) >>> 0;
			i = i + 1 >> 0;
		}
		if ((h === hashsep) && s.substring(0, n) === sep) {
			return 0;
		}
		i$1 = n;
		while (i$1 < s.length) {
			h = (((h >>> 16 << 16) * 16777619 >>> 0) + (h << 16 >>> 16) * 16777619) >>> 0;
			h = h + ((s.charCodeAt(i$1) >>> 0)) >>> 0;
			h = h - ((x = (s.charCodeAt((i$1 - n >> 0)) >>> 0), (((pow >>> 16 << 16) * x >>> 0) + (pow << 16 >>> 16) * x) >>> 0)) >>> 0;
			i$1 = i$1 + 1 >> 0;
			if ((h === hashsep) && s.substring((i$1 - n >> 0), i$1) === sep) {
				return i$1 - n >> 0;
			}
		}
		return -1;
	};
	IndexRune = $pkg.IndexRune = function(s, r) {
		var b, i, _ref, _i, _rune, c, i$1;
		if (r < 128) {
			b = (r << 24 >>> 24);
			i = 0;
			while (i < s.length) {
				if (s.charCodeAt(i) === b) {
					return i;
				}
				i = i + 1 >> 0;
			}
		} else {
			_ref = s;
			_i = 0;
			while (_i < _ref.length) {
				_rune = $decodeRune(_ref, _i);
				c = _rune[0];
				i$1 = _i;
				if (c === r) {
					return i$1;
				}
				_i += _rune[1];
			}
		}
		return -1;
	};
	Map = $pkg.Map = function(mapping, s) {
		var maxbytes, nbytes, b, _ref, _i, _rune, c, i, r, wid, nb;
		maxbytes = s.length;
		nbytes = 0;
		b = ($sliceType($Uint8)).nil;
		_ref = s;
		_i = 0;
		while (_i < _ref.length) {
			_rune = $decodeRune(_ref, _i);
			c = _rune[0];
			i = _i;
			r = mapping(c);
			if (b === ($sliceType($Uint8)).nil) {
				if (r === c) {
					_i += _rune[1];
					continue;
				}
				b = ($sliceType($Uint8)).make(maxbytes, 0, function() { return 0; });
				nbytes = $copyString(b, s.substring(0, i));
			}
			if (r >= 0) {
				wid = 1;
				if (r >= 128) {
					wid = utf8.RuneLen(r);
				}
				if ((nbytes + wid >> 0) > maxbytes) {
					maxbytes = ((((maxbytes >>> 16 << 16) * 2 >> 0) + (maxbytes << 16 >>> 16) * 2) >> 0) + 4 >> 0;
					nb = ($sliceType($Uint8)).make(maxbytes, 0, function() { return 0; });
					$copySlice(nb, $subslice(b, 0, nbytes));
					b = nb;
				}
				nbytes = nbytes + (utf8.EncodeRune($subslice(b, nbytes, maxbytes), r)) >> 0;
			}
			_i += _rune[1];
		}
		if (b === ($sliceType($Uint8)).nil) {
			return s;
		}
		return $bytesToString($subslice(b, 0, nbytes));
	};
	EqualFold = $pkg.EqualFold = function(s, t) {
		var _tmp, _tmp$1, sr, tr, _tmp$2, _tmp$3, _tuple, r, size, _tmp$4, _tmp$5, _tmp$6, _tmp$7, _tuple$1, r$1, size$1, _tmp$8, _tmp$9, _tmp$10, _tmp$11, r$2;
		while (!(s === "") && !(t === "")) {
			_tmp = 0; _tmp$1 = 0; sr = _tmp; tr = _tmp$1;
			if (s.charCodeAt(0) < 128) {
				_tmp$2 = (s.charCodeAt(0) >> 0); _tmp$3 = s.substring(1); sr = _tmp$2; s = _tmp$3;
			} else {
				_tuple = utf8.DecodeRuneInString(s); r = _tuple[0]; size = _tuple[1];
				_tmp$4 = r; _tmp$5 = s.substring(size); sr = _tmp$4; s = _tmp$5;
			}
			if (t.charCodeAt(0) < 128) {
				_tmp$6 = (t.charCodeAt(0) >> 0); _tmp$7 = t.substring(1); tr = _tmp$6; t = _tmp$7;
			} else {
				_tuple$1 = utf8.DecodeRuneInString(t); r$1 = _tuple$1[0]; size$1 = _tuple$1[1];
				_tmp$8 = r$1; _tmp$9 = t.substring(size$1); tr = _tmp$8; t = _tmp$9;
			}
			if (tr === sr) {
				continue;
			}
			if (tr < sr) {
				_tmp$10 = sr; _tmp$11 = tr; tr = _tmp$10; sr = _tmp$11;
			}
			if (tr < 128 && 65 <= sr && sr <= 90) {
				if (tr === ((sr + 97 >> 0) - 65 >> 0)) {
					continue;
				}
				return false;
			}
			r$2 = unicode.SimpleFold(sr);
			while (!((r$2 === sr)) && r$2 < tr) {
				r$2 = unicode.SimpleFold(r$2);
			}
			if (r$2 === tr) {
				continue;
			}
			return false;
		}
		return s === t;
	};
	$pkg.init = function() {
	};
	return $pkg;
})();
$packages["encoding/base64"] = (function() {
	var $pkg = {}, bytes = $packages["bytes"], io = $packages["io"], strconv = $packages["strconv"], strings = $packages["strings"], Encoding, CorruptInputError, NewEncoding, removeNewlinesMapper;
	Encoding = $pkg.Encoding = $newType(0, "Struct", "base64.Encoding", "Encoding", "encoding/base64", function(encode_, decodeMap_) {
		this.$val = this;
		this.encode = encode_ !== undefined ? encode_ : "";
		this.decodeMap = decodeMap_ !== undefined ? decodeMap_ : $makeNativeArray("Uint8", 256, function() { return 0; });
	});
	CorruptInputError = $pkg.CorruptInputError = $newType(8, "Int64", "base64.CorruptInputError", "CorruptInputError", "encoding/base64", null);
	NewEncoding = $pkg.NewEncoding = function(encoder$1) {
		var e, i, i$1;
		e = new Encoding.Ptr();
		e.encode = encoder$1;
		i = 0;
		while (i < 256) {
			e.decodeMap[i] = 255;
			i = i + 1 >> 0;
		}
		i$1 = 0;
		while (i$1 < encoder$1.length) {
			e.decodeMap[encoder$1.charCodeAt(i$1)] = (i$1 << 24 >>> 24);
			i$1 = i$1 + 1 >> 0;
		}
		return e;
	};
	Encoding.Ptr.prototype.Encode = function(dst, src) {
		var enc, _ref, _lhs, _index, _lhs$1, _index$1, _lhs$2, _index$2, _lhs$3, _index$3, _lhs$4, _index$4, _lhs$5, _index$5, _lhs$6, _index$6, _lhs$7, _index$7, _lhs$8, _index$8, _lhs$9, _index$9, _lhs$10, _index$10, _lhs$11, _index$11, j;
		enc = this;
		if (src.length === 0) {
			return;
		}
		while (src.length > 0) {
			(0 < 0 || 0 >= dst.length) ? $throwRuntimeError("index out of range") : dst.array[dst.offset + 0] = 0;
			(1 < 0 || 1 >= dst.length) ? $throwRuntimeError("index out of range") : dst.array[dst.offset + 1] = 0;
			(2 < 0 || 2 >= dst.length) ? $throwRuntimeError("index out of range") : dst.array[dst.offset + 2] = 0;
			(3 < 0 || 3 >= dst.length) ? $throwRuntimeError("index out of range") : dst.array[dst.offset + 3] = 0;
			_ref = src.length;
			if (_ref === 2) {
				_lhs = dst; _index = 2; (_index < 0 || _index >= _lhs.length) ? $throwRuntimeError("index out of range") : _lhs.array[_lhs.offset + _index] = (((_index < 0 || _index >= _lhs.length) ? $throwRuntimeError("index out of range") : _lhs.array[_lhs.offset + _index]) | (((((((1 < 0 || 1 >= src.length) ? $throwRuntimeError("index out of range") : src.array[src.offset + 1]) << 2 << 24 >>> 24)) & 63) >>> 0))) >>> 0;
				_lhs$1 = dst; _index$1 = 1; (_index$1 < 0 || _index$1 >= _lhs$1.length) ? $throwRuntimeError("index out of range") : _lhs$1.array[_lhs$1.offset + _index$1] = (((_index$1 < 0 || _index$1 >= _lhs$1.length) ? $throwRuntimeError("index out of range") : _lhs$1.array[_lhs$1.offset + _index$1]) | ((((1 < 0 || 1 >= src.length) ? $throwRuntimeError("index out of range") : src.array[src.offset + 1]) >>> 4 << 24 >>> 24))) >>> 0;
				_lhs$2 = dst; _index$2 = 1; (_index$2 < 0 || _index$2 >= _lhs$2.length) ? $throwRuntimeError("index out of range") : _lhs$2.array[_lhs$2.offset + _index$2] = (((_index$2 < 0 || _index$2 >= _lhs$2.length) ? $throwRuntimeError("index out of range") : _lhs$2.array[_lhs$2.offset + _index$2]) | (((((((0 < 0 || 0 >= src.length) ? $throwRuntimeError("index out of range") : src.array[src.offset + 0]) << 4 << 24 >>> 24)) & 63) >>> 0))) >>> 0;
				_lhs$3 = dst; _index$3 = 0; (_index$3 < 0 || _index$3 >= _lhs$3.length) ? $throwRuntimeError("index out of range") : _lhs$3.array[_lhs$3.offset + _index$3] = (((_index$3 < 0 || _index$3 >= _lhs$3.length) ? $throwRuntimeError("index out of range") : _lhs$3.array[_lhs$3.offset + _index$3]) | ((((0 < 0 || 0 >= src.length) ? $throwRuntimeError("index out of range") : src.array[src.offset + 0]) >>> 2 << 24 >>> 24))) >>> 0;
			} else if (_ref === 1) {
				_lhs$4 = dst; _index$4 = 1; (_index$4 < 0 || _index$4 >= _lhs$4.length) ? $throwRuntimeError("index out of range") : _lhs$4.array[_lhs$4.offset + _index$4] = (((_index$4 < 0 || _index$4 >= _lhs$4.length) ? $throwRuntimeError("index out of range") : _lhs$4.array[_lhs$4.offset + _index$4]) | (((((((0 < 0 || 0 >= src.length) ? $throwRuntimeError("index out of range") : src.array[src.offset + 0]) << 4 << 24 >>> 24)) & 63) >>> 0))) >>> 0;
				_lhs$5 = dst; _index$5 = 0; (_index$5 < 0 || _index$5 >= _lhs$5.length) ? $throwRuntimeError("index out of range") : _lhs$5.array[_lhs$5.offset + _index$5] = (((_index$5 < 0 || _index$5 >= _lhs$5.length) ? $throwRuntimeError("index out of range") : _lhs$5.array[_lhs$5.offset + _index$5]) | ((((0 < 0 || 0 >= src.length) ? $throwRuntimeError("index out of range") : src.array[src.offset + 0]) >>> 2 << 24 >>> 24))) >>> 0;
			} else {
				_lhs$6 = dst; _index$6 = 3; (_index$6 < 0 || _index$6 >= _lhs$6.length) ? $throwRuntimeError("index out of range") : _lhs$6.array[_lhs$6.offset + _index$6] = (((_index$6 < 0 || _index$6 >= _lhs$6.length) ? $throwRuntimeError("index out of range") : _lhs$6.array[_lhs$6.offset + _index$6]) | (((((2 < 0 || 2 >= src.length) ? $throwRuntimeError("index out of range") : src.array[src.offset + 2]) & 63) >>> 0))) >>> 0;
				_lhs$7 = dst; _index$7 = 2; (_index$7 < 0 || _index$7 >= _lhs$7.length) ? $throwRuntimeError("index out of range") : _lhs$7.array[_lhs$7.offset + _index$7] = (((_index$7 < 0 || _index$7 >= _lhs$7.length) ? $throwRuntimeError("index out of range") : _lhs$7.array[_lhs$7.offset + _index$7]) | ((((2 < 0 || 2 >= src.length) ? $throwRuntimeError("index out of range") : src.array[src.offset + 2]) >>> 6 << 24 >>> 24))) >>> 0;
				_lhs$8 = dst; _index$8 = 2; (_index$8 < 0 || _index$8 >= _lhs$8.length) ? $throwRuntimeError("index out of range") : _lhs$8.array[_lhs$8.offset + _index$8] = (((_index$8 < 0 || _index$8 >= _lhs$8.length) ? $throwRuntimeError("index out of range") : _lhs$8.array[_lhs$8.offset + _index$8]) | (((((((1 < 0 || 1 >= src.length) ? $throwRuntimeError("index out of range") : src.array[src.offset + 1]) << 2 << 24 >>> 24)) & 63) >>> 0))) >>> 0;
				_lhs$9 = dst; _index$9 = 1; (_index$9 < 0 || _index$9 >= _lhs$9.length) ? $throwRuntimeError("index out of range") : _lhs$9.array[_lhs$9.offset + _index$9] = (((_index$9 < 0 || _index$9 >= _lhs$9.length) ? $throwRuntimeError("index out of range") : _lhs$9.array[_lhs$9.offset + _index$9]) | ((((1 < 0 || 1 >= src.length) ? $throwRuntimeError("index out of range") : src.array[src.offset + 1]) >>> 4 << 24 >>> 24))) >>> 0;
				_lhs$10 = dst; _index$10 = 1; (_index$10 < 0 || _index$10 >= _lhs$10.length) ? $throwRuntimeError("index out of range") : _lhs$10.array[_lhs$10.offset + _index$10] = (((_index$10 < 0 || _index$10 >= _lhs$10.length) ? $throwRuntimeError("index out of range") : _lhs$10.array[_lhs$10.offset + _index$10]) | (((((((0 < 0 || 0 >= src.length) ? $throwRuntimeError("index out of range") : src.array[src.offset + 0]) << 4 << 24 >>> 24)) & 63) >>> 0))) >>> 0;
				_lhs$11 = dst; _index$11 = 0; (_index$11 < 0 || _index$11 >= _lhs$11.length) ? $throwRuntimeError("index out of range") : _lhs$11.array[_lhs$11.offset + _index$11] = (((_index$11 < 0 || _index$11 >= _lhs$11.length) ? $throwRuntimeError("index out of range") : _lhs$11.array[_lhs$11.offset + _index$11]) | ((((0 < 0 || 0 >= src.length) ? $throwRuntimeError("index out of range") : src.array[src.offset + 0]) >>> 2 << 24 >>> 24))) >>> 0;
			}
			j = 0;
			while (j < 4) {
				(j < 0 || j >= dst.length) ? $throwRuntimeError("index out of range") : dst.array[dst.offset + j] = enc.encode.charCodeAt(((j < 0 || j >= dst.length) ? $throwRuntimeError("index out of range") : dst.array[dst.offset + j]));
				j = j + 1 >> 0;
			}
			if (src.length < 3) {
				(3 < 0 || 3 >= dst.length) ? $throwRuntimeError("index out of range") : dst.array[dst.offset + 3] = 61;
				if (src.length < 2) {
					(2 < 0 || 2 >= dst.length) ? $throwRuntimeError("index out of range") : dst.array[dst.offset + 2] = 61;
				}
				break;
			}
			src = $subslice(src, 3);
			dst = $subslice(dst, 4);
		}
	};
	Encoding.prototype.Encode = function(dst, src) { return this.$val.Encode(dst, src); };
	Encoding.Ptr.prototype.EncodeToString = function(src) {
		var enc, buf;
		enc = this;
		buf = ($sliceType($Uint8)).make(enc.EncodedLen(src.length), 0, function() { return 0; });
		enc.Encode(buf, src);
		return $bytesToString(buf);
	};
	Encoding.prototype.EncodeToString = function(src) { return this.$val.EncodeToString(src); };
	Encoding.Ptr.prototype.EncodedLen = function(n) {
		var enc, x, _q;
		enc = this;
		return (x = (_q = ((n + 2 >> 0)) / 3, (_q === _q && _q !== 1/0 && _q !== -1/0) ? _q >> 0 : $throwRuntimeError("integer divide by zero")), (((x >>> 16 << 16) * 4 >> 0) + (x << 16 >>> 16) * 4) >> 0);
	};
	Encoding.prototype.EncodedLen = function(n) { return this.$val.EncodedLen(n); };
	CorruptInputError.prototype.Error = function() {
		var e;
		e = this;
		return "illegal base64 data at input byte " + strconv.FormatInt(new $Int64(e.high, e.low), 10);
	};
	$ptrType(CorruptInputError).prototype.Error = function() { return this.$get().Error(); };
	Encoding.Ptr.prototype.decode = function(dst, src) {
		var n, end, err, enc, olen, dbuf, dlen, j, _tmp, _tmp$1, _tmp$2, in$1, _tmp$3, _tmp$4, _tmp$5, _tmp$6, _tmp$7, _tmp$8, _tmp$9, _tmp$10, _tmp$11, _tmp$12, _tmp$13, _ref, _tmp$14, _tmp$15, _tmp$16;
		n = 0;
		end = false;
		err = null;
		enc = this;
		olen = src.length;
		while (src.length > 0 && !end) {
			dbuf = $makeNativeArray("Uint8", 4, function() { return 0; });
			dlen = 4;
			j = 0;
			while (j < 4) {
				if (src.length === 0) {
					_tmp = n; _tmp$1 = false; _tmp$2 = new CorruptInputError(0, ((olen - src.length >> 0) - j >> 0)); n = _tmp; end = _tmp$1; err = _tmp$2;
					return [n, end, err];
				}
				in$1 = ((0 < 0 || 0 >= src.length) ? $throwRuntimeError("index out of range") : src.array[src.offset + 0]);
				src = $subslice(src, 1);
				if ((in$1 === 61) && j >= 2 && src.length < 4) {
					if ((src.length + j >> 0) < 3) {
						_tmp$3 = n; _tmp$4 = false; _tmp$5 = new CorruptInputError(0, olen); n = _tmp$3; end = _tmp$4; err = _tmp$5;
						return [n, end, err];
					}
					if (src.length > 0 && !((((0 < 0 || 0 >= src.length) ? $throwRuntimeError("index out of range") : src.array[src.offset + 0]) === 61))) {
						_tmp$6 = n; _tmp$7 = false; _tmp$8 = new CorruptInputError(0, ((olen - src.length >> 0) - 1 >> 0)); n = _tmp$6; end = _tmp$7; err = _tmp$8;
						return [n, end, err];
					}
					_tmp$9 = j; _tmp$10 = true; dlen = _tmp$9; end = _tmp$10;
					break;
				}
				dbuf[j] = enc.decodeMap[in$1];
				if (dbuf[j] === 255) {
					_tmp$11 = n; _tmp$12 = false; _tmp$13 = new CorruptInputError(0, ((olen - src.length >> 0) - 1 >> 0)); n = _tmp$11; end = _tmp$12; err = _tmp$13;
					return [n, end, err];
				}
				j = j + 1 >> 0;
			}
			_ref = dlen;
			if (_ref === 4) {
				(2 < 0 || 2 >= dst.length) ? $throwRuntimeError("index out of range") : dst.array[dst.offset + 2] = ((dbuf[2] << 6 << 24 >>> 24) | dbuf[3]) >>> 0;
				(1 < 0 || 1 >= dst.length) ? $throwRuntimeError("index out of range") : dst.array[dst.offset + 1] = ((dbuf[1] << 4 << 24 >>> 24) | (dbuf[2] >>> 2 << 24 >>> 24)) >>> 0;
				(0 < 0 || 0 >= dst.length) ? $throwRuntimeError("index out of range") : dst.array[dst.offset + 0] = ((dbuf[0] << 2 << 24 >>> 24) | (dbuf[1] >>> 4 << 24 >>> 24)) >>> 0;
			} else if (_ref === 3) {
				(1 < 0 || 1 >= dst.length) ? $throwRuntimeError("index out of range") : dst.array[dst.offset + 1] = ((dbuf[1] << 4 << 24 >>> 24) | (dbuf[2] >>> 2 << 24 >>> 24)) >>> 0;
				(0 < 0 || 0 >= dst.length) ? $throwRuntimeError("index out of range") : dst.array[dst.offset + 0] = ((dbuf[0] << 2 << 24 >>> 24) | (dbuf[1] >>> 4 << 24 >>> 24)) >>> 0;
			} else if (_ref === 2) {
				(0 < 0 || 0 >= dst.length) ? $throwRuntimeError("index out of range") : dst.array[dst.offset + 0] = ((dbuf[0] << 2 << 24 >>> 24) | (dbuf[1] >>> 4 << 24 >>> 24)) >>> 0;
			}
			dst = $subslice(dst, 3);
			n = n + ((dlen - 1 >> 0)) >> 0;
		}
		_tmp$14 = n; _tmp$15 = end; _tmp$16 = null; n = _tmp$14; end = _tmp$15; err = _tmp$16;
		return [n, end, err];
	};
	Encoding.prototype.decode = function(dst, src) { return this.$val.decode(dst, src); };
	Encoding.Ptr.prototype.Decode = function(dst, src) {
		var n, err, enc, _tuple;
		n = 0;
		err = null;
		enc = this;
		src = bytes.Map(removeNewlinesMapper, src);
		_tuple = enc.decode(dst, src); n = _tuple[0]; err = _tuple[2];
		return [n, err];
	};
	Encoding.prototype.Decode = function(dst, src) { return this.$val.Decode(dst, src); };
	Encoding.Ptr.prototype.DecodeString = function(s) {
		var enc, dbuf, _tuple, n, err;
		enc = this;
		s = strings.Map(removeNewlinesMapper, s);
		dbuf = ($sliceType($Uint8)).make(enc.DecodedLen(s.length), 0, function() { return 0; });
		_tuple = enc.Decode(dbuf, new ($sliceType($Uint8))($stringToBytes(s))); n = _tuple[0]; err = _tuple[1];
		return [$subslice(dbuf, 0, n), err];
	};
	Encoding.prototype.DecodeString = function(s) { return this.$val.DecodeString(s); };
	Encoding.Ptr.prototype.DecodedLen = function(n) {
		var enc, x, _q;
		enc = this;
		return (x = (_q = n / 4, (_q === _q && _q !== 1/0 && _q !== -1/0) ? _q >> 0 : $throwRuntimeError("integer divide by zero")), (((x >>> 16 << 16) * 3 >> 0) + (x << 16 >>> 16) * 3) >> 0);
	};
	Encoding.prototype.DecodedLen = function(n) { return this.$val.DecodedLen(n); };
	$pkg.init = function() {
		($ptrType(Encoding)).methods = [["Decode", "Decode", "", [($sliceType($Uint8)), ($sliceType($Uint8))], [$Int, $error], false, -1], ["DecodeString", "DecodeString", "", [$String], [($sliceType($Uint8)), $error], false, -1], ["DecodedLen", "DecodedLen", "", [$Int], [$Int], false, -1], ["Encode", "Encode", "", [($sliceType($Uint8)), ($sliceType($Uint8))], [], false, -1], ["EncodeToString", "EncodeToString", "", [($sliceType($Uint8))], [$String], false, -1], ["EncodedLen", "EncodedLen", "", [$Int], [$Int], false, -1], ["decode", "decode", "encoding/base64", [($sliceType($Uint8)), ($sliceType($Uint8))], [$Int, $Bool, $error], false, -1]];
		Encoding.init([["encode", "encode", "encoding/base64", $String, ""], ["decodeMap", "decodeMap", "encoding/base64", ($arrayType($Uint8, 256)), ""]]);
		CorruptInputError.methods = [["Error", "Error", "", [], [$String], false, -1]];
		($ptrType(CorruptInputError)).methods = [["Error", "Error", "", [], [$String], false, -1]];
		$pkg.StdEncoding = NewEncoding("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/");
		$pkg.URLEncoding = NewEncoding("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_");
		removeNewlinesMapper = (function(r) {
			if ((r === 13) || (r === 10)) {
				return -1;
			}
			return r;
		});
	};
	return $pkg;
})();
$packages["syscall"] = (function() {
	var $pkg = {}, bytes = $packages["bytes"], js = $packages["github.com/gopherjs/gopherjs/js"], sync = $packages["sync"], runtime = $packages["runtime"], mmapper, Errno, Timespec, Stat_t, Dirent, printWarning, printToConsole, syscall, Syscall, Syscall6, BytePtrFromString, copyenv, Getenv, itoa, Open, clen, ReadDirent, ParseDirent, Read, Write, open, Close, Fchdir, Fchmod, Fsync, Getdents, read, write, munmap, Fchown, Fstat, Ftruncate, Lstat, Pread, Pwrite, Seek, mmap, warningPrinted, lineBuffer, syscallModule, alreadyTriedToLoad, minusOne, envOnce, envLock, env, envs, mapper, errors;
	mmapper = $pkg.mmapper = $newType(0, "Struct", "syscall.mmapper", "mmapper", "syscall", function(Mutex_, active_, mmap_, munmap_) {
		this.$val = this;
		this.Mutex = Mutex_ !== undefined ? Mutex_ : new sync.Mutex.Ptr();
		this.active = active_ !== undefined ? active_ : false;
		this.mmap = mmap_ !== undefined ? mmap_ : $throwNilPointerError;
		this.munmap = munmap_ !== undefined ? munmap_ : $throwNilPointerError;
	});
	Errno = $pkg.Errno = $newType(4, "Uintptr", "syscall.Errno", "Errno", "syscall", null);
	Timespec = $pkg.Timespec = $newType(0, "Struct", "syscall.Timespec", "Timespec", "syscall", function(Sec_, Nsec_) {
		this.$val = this;
		this.Sec = Sec_ !== undefined ? Sec_ : new $Int64(0, 0);
		this.Nsec = Nsec_ !== undefined ? Nsec_ : new $Int64(0, 0);
	});
	Stat_t = $pkg.Stat_t = $newType(0, "Struct", "syscall.Stat_t", "Stat_t", "syscall", function(Dev_, Ino_, Nlink_, Mode_, Uid_, Gid_, X__pad0_, Rdev_, Size_, Blksize_, Blocks_, Atim_, Mtim_, Ctim_, X__unused_) {
		this.$val = this;
		this.Dev = Dev_ !== undefined ? Dev_ : new $Uint64(0, 0);
		this.Ino = Ino_ !== undefined ? Ino_ : new $Uint64(0, 0);
		this.Nlink = Nlink_ !== undefined ? Nlink_ : new $Uint64(0, 0);
		this.Mode = Mode_ !== undefined ? Mode_ : 0;
		this.Uid = Uid_ !== undefined ? Uid_ : 0;
		this.Gid = Gid_ !== undefined ? Gid_ : 0;
		this.X__pad0 = X__pad0_ !== undefined ? X__pad0_ : 0;
		this.Rdev = Rdev_ !== undefined ? Rdev_ : new $Uint64(0, 0);
		this.Size = Size_ !== undefined ? Size_ : new $Int64(0, 0);
		this.Blksize = Blksize_ !== undefined ? Blksize_ : new $Int64(0, 0);
		this.Blocks = Blocks_ !== undefined ? Blocks_ : new $Int64(0, 0);
		this.Atim = Atim_ !== undefined ? Atim_ : new Timespec.Ptr();
		this.Mtim = Mtim_ !== undefined ? Mtim_ : new Timespec.Ptr();
		this.Ctim = Ctim_ !== undefined ? Ctim_ : new Timespec.Ptr();
		this.X__unused = X__unused_ !== undefined ? X__unused_ : $makeNativeArray("Int64", 3, function() { return new $Int64(0, 0); });
	});
	Dirent = $pkg.Dirent = $newType(0, "Struct", "syscall.Dirent", "Dirent", "syscall", function(Ino_, Off_, Reclen_, Type_, Name_, Pad_cgo_0_) {
		this.$val = this;
		this.Ino = Ino_ !== undefined ? Ino_ : new $Uint64(0, 0);
		this.Off = Off_ !== undefined ? Off_ : new $Int64(0, 0);
		this.Reclen = Reclen_ !== undefined ? Reclen_ : 0;
		this.Type = Type_ !== undefined ? Type_ : 0;
		this.Name = Name_ !== undefined ? Name_ : $makeNativeArray("Int8", 256, function() { return 0; });
		this.Pad_cgo_0 = Pad_cgo_0_ !== undefined ? Pad_cgo_0_ : $makeNativeArray("Uint8", 5, function() { return 0; });
	});
	printWarning = function() {
		if (!warningPrinted) {
			console.log("warning: system calls not available, see https://github.com/gopherjs/gopherjs/blob/master/doc/syscalls.md");
		}
		warningPrinted = true;
	};
	printToConsole = function(b) {
		var i;
		lineBuffer = $appendSlice(lineBuffer, b);
		while (true) {
			i = bytes.IndexByte(lineBuffer, 10);
			if (i === -1) {
				break;
			}
			$global.console.log($externalize($bytesToString($subslice(lineBuffer, 0, i)), $String));
			lineBuffer = $subslice(lineBuffer, (i + 1 >> 0));
		}
	};
	syscall = function(name) {
		var require, syscallHandler;
		var $deferred = [];
		try {
			$deferred.push({ fun: $recover, args: [] });
			if (syscallModule === null) {
				if (alreadyTriedToLoad) {
					return null;
				}
				alreadyTriedToLoad = true;
				require = $global.require;
				if (require === undefined) {
					syscallHandler = $syscall;
					if (!(syscallHandler === undefined)) {
						return syscallHandler;
					}
					throw $panic(new $String(""));
				}
				syscallModule = require($externalize("syscall", $String));
			}
			return syscallModule[$externalize(name, $String)];
		} catch($err) {
			$pushErr($err);
			return null;
		} finally {
			$callDeferred($deferred);
		}
	};
	Syscall = $pkg.Syscall = function(trap, a1, a2, a3) {
		var r1, r2, err, f, r, _tmp, _tmp$1, _tmp$2, x, b, _tmp$3, _tmp$4, _tmp$5, _tmp$6, _tmp$7, _tmp$8;
		r1 = 0;
		r2 = 0;
		err = 0;
		f = syscall("Syscall");
		if (!(f === null)) {
			r = f(trap, a1, a2, a3);
			_tmp = (($parseInt(r[0]) >> 0) >>> 0); _tmp$1 = (($parseInt(r[1]) >> 0) >>> 0); _tmp$2 = (($parseInt(r[2]) >> 0) >>> 0); r1 = _tmp; r2 = _tmp$1; err = _tmp$2;
			return [r1, r2, err];
		}
		if ((trap === 1) && ((a1 === 1) || (a1 === 2))) {
			b = (x = $internalize(new ($sliceType($Uint8))(a2), $emptyInterface), (x !== null && x.constructor === ($sliceType($Uint8)) ? x.$val : $typeAssertionFailed(x, ($sliceType($Uint8)))));
			printToConsole(b);
			_tmp$3 = (b.length >>> 0); _tmp$4 = 0; _tmp$5 = 0; r1 = _tmp$3; r2 = _tmp$4; err = _tmp$5;
			return [r1, r2, err];
		}
		printWarning();
		_tmp$6 = (minusOne >>> 0); _tmp$7 = 0; _tmp$8 = 13; r1 = _tmp$6; r2 = _tmp$7; err = _tmp$8;
		return [r1, r2, err];
	};
	Syscall6 = $pkg.Syscall6 = function(trap, a1, a2, a3, a4, a5, a6) {
		var r1, r2, err, f, r, _tmp, _tmp$1, _tmp$2, _tmp$3, _tmp$4, _tmp$5;
		r1 = 0;
		r2 = 0;
		err = 0;
		f = syscall("Syscall6");
		if (!(f === null)) {
			r = f(trap, a1, a2, a3, a4, a5, a6);
			_tmp = (($parseInt(r[0]) >> 0) >>> 0); _tmp$1 = (($parseInt(r[1]) >> 0) >>> 0); _tmp$2 = (($parseInt(r[2]) >> 0) >>> 0); r1 = _tmp; r2 = _tmp$1; err = _tmp$2;
			return [r1, r2, err];
		}
		printWarning();
		_tmp$3 = (minusOne >>> 0); _tmp$4 = 0; _tmp$5 = 13; r1 = _tmp$3; r2 = _tmp$4; err = _tmp$5;
		return [r1, r2, err];
	};
	BytePtrFromString = $pkg.BytePtrFromString = function(s) {
		return [$stringToBytes($externalize(s, $String), $externalize(true, $Bool)), null];
	};
	copyenv = function() {
		var _ref, _i, s, i, j, key, _tuple, _entry, ok, _key;
		env = new $Map();
		_ref = envs;
		_i = 0;
		while (_i < _ref.length) {
			s = ((_i < 0 || _i >= _ref.length) ? $throwRuntimeError("index out of range") : _ref.array[_ref.offset + _i]);
			i = _i;
			j = 0;
			while (j < s.length) {
				if (s.charCodeAt(j) === 61) {
					key = s.substring(0, j);
					_tuple = (_entry = env[key], _entry !== undefined ? [_entry.v, true] : [0, false]); ok = _tuple[1];
					if (!ok) {
						_key = key; (env || $throwRuntimeError("assignment to entry in nil map"))[_key] = { k: _key, v: i };
					}
					break;
				}
				j = j + 1 >> 0;
			}
			_i++;
		}
	};
	Getenv = $pkg.Getenv = function(key) {
		var value, found, _tmp, _tmp$1, _tuple, _entry, i, ok, _tmp$2, _tmp$3, s, i$1, _tmp$4, _tmp$5, _tmp$6, _tmp$7;
		value = "";
		found = false;
		var $deferred = [];
		try {
			envOnce.Do(copyenv);
			if (key.length === 0) {
				_tmp = ""; _tmp$1 = false; value = _tmp; found = _tmp$1;
				return [value, found];
			}
			envLock.RLock();
			$deferred.push({ recv: envLock, method: "RUnlock", args: [] });
			_tuple = (_entry = env[key], _entry !== undefined ? [_entry.v, true] : [0, false]); i = _tuple[0]; ok = _tuple[1];
			if (!ok) {
				_tmp$2 = ""; _tmp$3 = false; value = _tmp$2; found = _tmp$3;
				return [value, found];
			}
			s = ((i < 0 || i >= envs.length) ? $throwRuntimeError("index out of range") : envs.array[envs.offset + i]);
			i$1 = 0;
			while (i$1 < s.length) {
				if (s.charCodeAt(i$1) === 61) {
					_tmp$4 = s.substring((i$1 + 1 >> 0)); _tmp$5 = true; value = _tmp$4; found = _tmp$5;
					return [value, found];
				}
				i$1 = i$1 + 1 >> 0;
			}
			_tmp$6 = ""; _tmp$7 = false; value = _tmp$6; found = _tmp$7;
			return [value, found];
		} catch($err) {
			$pushErr($err);
		} finally {
			$callDeferred($deferred);
			return [value, found];
		}
	};
	itoa = function(val) {
		var buf, i, _r, _q;
		if (val < 0) {
			return "-" + itoa(-val);
		}
		buf = $makeNativeArray("Uint8", 32, function() { return 0; });
		i = 31;
		while (val >= 10) {
			buf[i] = (((_r = val % 10, _r === _r ? _r : $throwRuntimeError("integer divide by zero")) + 48 >> 0) << 24 >>> 24);
			i = i - 1 >> 0;
			val = (_q = val / 10, (_q === _q && _q !== 1/0 && _q !== -1/0) ? _q >> 0 : $throwRuntimeError("integer divide by zero"));
		}
		buf[i] = ((val + 48 >> 0) << 24 >>> 24);
		return $bytesToString($subslice(new ($sliceType($Uint8))(buf), i));
	};
	Timespec.Ptr.prototype.Unix = function() {
		var sec, nsec, ts, _tmp, _tmp$1;
		sec = new $Int64(0, 0);
		nsec = new $Int64(0, 0);
		ts = this;
		_tmp = ts.Sec; _tmp$1 = ts.Nsec; sec = _tmp; nsec = _tmp$1;
		return [sec, nsec];
	};
	Timespec.prototype.Unix = function() { return this.$val.Unix(); };
	Timespec.Ptr.prototype.Nano = function() {
		var ts, x, x$1;
		ts = this;
		return (x = $mul64(ts.Sec, new $Int64(0, 1000000000)), x$1 = ts.Nsec, new $Int64(x.high + x$1.high, x.low + x$1.low));
	};
	Timespec.prototype.Nano = function() { return this.$val.Nano(); };
	Open = $pkg.Open = function(path, mode, perm) {
		var fd, err, _tuple;
		fd = 0;
		err = null;
		_tuple = open(path, mode | 0, perm); fd = _tuple[0]; err = _tuple[1];
		return [fd, err];
	};
	clen = function(n) {
		var i;
		i = 0;
		while (i < n.length) {
			if (((i < 0 || i >= n.length) ? $throwRuntimeError("index out of range") : n.array[n.offset + i]) === 0) {
				return i;
			}
			i = i + 1 >> 0;
		}
		return n.length;
	};
	ReadDirent = $pkg.ReadDirent = function(fd, buf) {
		var n, err, _tuple;
		n = 0;
		err = null;
		_tuple = Getdents(fd, buf); n = _tuple[0]; err = _tuple[1];
		return [n, err];
	};
	ParseDirent = $pkg.ParseDirent = function(buf, max, names) {
		var consumed, count, newnames, origlen, dirent, _array, _struct, _view, x, bytes$1, name, _tmp, _tmp$1, _tmp$2;
		consumed = 0;
		count = 0;
		newnames = ($sliceType($String)).nil;
		origlen = buf.length;
		count = 0;
		while (!((max === 0)) && buf.length > 0) {
			dirent = [undefined];
			dirent[0] = (_array = $sliceToArray(buf), _struct = new Dirent.Ptr(), _view = new DataView(_array.buffer, _array.byteOffset), _struct.Ino = new $Uint64(_view.getUint32(4, true), _view.getUint32(0, true)), _struct.Off = new $Int64(_view.getUint32(12, true), _view.getUint32(8, true)), _struct.Reclen = _view.getUint16(16, true), _struct.Type = _view.getUint8(18, true), _struct.Name = new ($nativeArray("Int8"))(_array.buffer, $min(_array.byteOffset + 19, _array.buffer.byteLength)), _struct.Pad_cgo_0 = new ($nativeArray("Uint8"))(_array.buffer, $min(_array.byteOffset + 275, _array.buffer.byteLength)), _struct);
			buf = $subslice(buf, dirent[0].Reclen);
			if ((x = dirent[0].Ino, (x.high === 0 && x.low === 0))) {
				continue;
			}
			bytes$1 = $sliceToArray(new ($sliceType($Uint8))(dirent[0].Name));
			name = $bytesToString($subslice(new ($sliceType($Uint8))(bytes$1), 0, clen(new ($sliceType($Uint8))(bytes$1))));
			if (name === "." || name === "..") {
				continue;
			}
			max = max - 1 >> 0;
			count = count + 1 >> 0;
			names = $append(names, name);
		}
		_tmp = origlen - buf.length >> 0; _tmp$1 = count; _tmp$2 = names; consumed = _tmp; count = _tmp$1; newnames = _tmp$2;
		return [consumed, count, newnames];
	};
	mmapper.Ptr.prototype.Mmap = function(fd, offset, length, prot, flags) {
		var data, err, m, _tmp, _tmp$1, _tuple, addr, errno, _tmp$2, _tmp$3, sl, b, v, x, x$1, p, _key, _tmp$4, _tmp$5;
		data = ($sliceType($Uint8)).nil;
		err = null;
		var $deferred = [];
		try {
			m = this;
			if (length <= 0) {
				_tmp = ($sliceType($Uint8)).nil; _tmp$1 = new Errno(22); data = _tmp; err = _tmp$1;
				return [data, err];
			}
			_tuple = m.mmap(0, (length >>> 0), prot, flags, fd, offset); addr = _tuple[0]; errno = _tuple[1];
			if (!($interfaceIsEqual(errno, null))) {
				_tmp$2 = ($sliceType($Uint8)).nil; _tmp$3 = errno; data = _tmp$2; err = _tmp$3;
				return [data, err];
			}
			sl = new ($structType([["addr", "addr", "syscall", $Uintptr, ""], ["len", "len", "syscall", $Int, ""], ["cap", "cap", "syscall", $Int, ""]])).Ptr(addr, length, length);
			b = sl;
			p = new ($ptrType($Uint8))(function() { return (x$1 = b.capacity - 1 >> 0, ((x$1 < 0 || x$1 >= b.length) ? $throwRuntimeError("index out of range") : b.array[b.offset + x$1])); }, function(v) { (x = b.capacity - 1 >> 0, (x < 0 || x >= b.length) ? $throwRuntimeError("index out of range") : b.array[b.offset + x] = v);; });
			m.Mutex.Lock();
			$deferred.push({ recv: m, method: "Unlock", args: [] });
			_key = p; (m.active || $throwRuntimeError("assignment to entry in nil map"))[_key.$key()] = { k: _key, v: b };
			_tmp$4 = b; _tmp$5 = null; data = _tmp$4; err = _tmp$5;
			return [data, err];
		} catch($err) {
			$pushErr($err);
		} finally {
			$callDeferred($deferred);
			return [data, err];
		}
	};
	mmapper.prototype.Mmap = function(fd, offset, length, prot, flags) { return this.$val.Mmap(fd, offset, length, prot, flags); };
	mmapper.Ptr.prototype.Munmap = function(data) {
		var err, m, v, x, x$1, p, _entry, b, errno;
		err = null;
		var $deferred = [];
		try {
			m = this;
			if ((data.length === 0) || !((data.length === data.capacity))) {
				err = new Errno(22);
				return err;
			}
			p = new ($ptrType($Uint8))(function() { return (x$1 = data.capacity - 1 >> 0, ((x$1 < 0 || x$1 >= data.length) ? $throwRuntimeError("index out of range") : data.array[data.offset + x$1])); }, function(v) { (x = data.capacity - 1 >> 0, (x < 0 || x >= data.length) ? $throwRuntimeError("index out of range") : data.array[data.offset + x] = v);; });
			m.Mutex.Lock();
			$deferred.push({ recv: m, method: "Unlock", args: [] });
			b = (_entry = m.active[p.$key()], _entry !== undefined ? _entry.v : ($sliceType($Uint8)).nil);
			if (b === ($sliceType($Uint8)).nil || !($sliceIsEqual(b, 0, data, 0))) {
				err = new Errno(22);
				return err;
			}
			errno = m.munmap($sliceToArray(b), (b.length >>> 0));
			if (!($interfaceIsEqual(errno, null))) {
				err = errno;
				return err;
			}
			delete m.active[p.$key()];
			err = null;
			return err;
		} catch($err) {
			$pushErr($err);
		} finally {
			$callDeferred($deferred);
			return err;
		}
	};
	mmapper.prototype.Munmap = function(data) { return this.$val.Munmap(data); };
	Errno.prototype.Error = function() {
		var e, s;
		e = this.$val;
		if (0 <= (e >> 0) && (e >> 0) < 133) {
			s = errors[e];
			if (!(s === "")) {
				return s;
			}
		}
		return "errno " + itoa((e >> 0));
	};
	$ptrType(Errno).prototype.Error = function() { return new Errno(this.$get()).Error(); };
	Errno.prototype.Temporary = function() {
		var e;
		e = this.$val;
		return (e === 4) || (e === 24) || (new Errno(e)).Timeout();
	};
	$ptrType(Errno).prototype.Temporary = function() { return new Errno(this.$get()).Temporary(); };
	Errno.prototype.Timeout = function() {
		var e;
		e = this.$val;
		return (e === 11) || (e === 11) || (e === 110);
	};
	$ptrType(Errno).prototype.Timeout = function() { return new Errno(this.$get()).Timeout(); };
	Read = $pkg.Read = function(fd, p) {
		var n, err, _tuple;
		n = 0;
		err = null;
		_tuple = read(fd, p); n = _tuple[0]; err = _tuple[1];
		return [n, err];
	};
	Write = $pkg.Write = function(fd, p) {
		var n, err, _tuple;
		n = 0;
		err = null;
		_tuple = write(fd, p); n = _tuple[0]; err = _tuple[1];
		return [n, err];
	};
	open = function(path, mode, perm) {
		var fd, err, _p0, _tuple, _tuple$1, r0, e1;
		fd = 0;
		err = null;
		_p0 = ($ptrType($Uint8)).nil;
		_tuple = BytePtrFromString(path); _p0 = _tuple[0]; err = _tuple[1];
		if (!($interfaceIsEqual(err, null))) {
			return [fd, err];
		}
		_tuple$1 = Syscall(2, _p0, (mode >>> 0), (perm >>> 0)); r0 = _tuple$1[0]; e1 = _tuple$1[2];
		fd = (r0 >> 0);
		if (!((e1 === 0))) {
			err = new Errno(e1);
		}
		return [fd, err];
	};
	Close = $pkg.Close = function(fd) {
		var err, _tuple, e1;
		err = null;
		_tuple = Syscall(3, (fd >>> 0), 0, 0); e1 = _tuple[2];
		if (!((e1 === 0))) {
			err = new Errno(e1);
		}
		return err;
	};
	Fchdir = $pkg.Fchdir = function(fd) {
		var err, _tuple, e1;
		err = null;
		_tuple = Syscall(81, (fd >>> 0), 0, 0); e1 = _tuple[2];
		if (!((e1 === 0))) {
			err = new Errno(e1);
		}
		return err;
	};
	Fchmod = $pkg.Fchmod = function(fd, mode) {
		var err, _tuple, e1;
		err = null;
		_tuple = Syscall(91, (fd >>> 0), (mode >>> 0), 0); e1 = _tuple[2];
		if (!((e1 === 0))) {
			err = new Errno(e1);
		}
		return err;
	};
	Fsync = $pkg.Fsync = function(fd) {
		var err, _tuple, e1;
		err = null;
		_tuple = Syscall(74, (fd >>> 0), 0, 0); e1 = _tuple[2];
		if (!((e1 === 0))) {
			err = new Errno(e1);
		}
		return err;
	};
	Getdents = $pkg.Getdents = function(fd, buf) {
		var n, err, _p0, _tuple, r0, e1;
		n = 0;
		err = null;
		_p0 = 0;
		if (buf.length > 0) {
			_p0 = $sliceToArray(buf);
		} else {
			_p0 = new Uint8Array(0);
		}
		_tuple = Syscall(217, (fd >>> 0), _p0, (buf.length >>> 0)); r0 = _tuple[0]; e1 = _tuple[2];
		n = (r0 >> 0);
		if (!((e1 === 0))) {
			err = new Errno(e1);
		}
		return [n, err];
	};
	read = function(fd, p) {
		var n, err, _p0, _tuple, r0, e1;
		n = 0;
		err = null;
		_p0 = 0;
		if (p.length > 0) {
			_p0 = $sliceToArray(p);
		} else {
			_p0 = new Uint8Array(0);
		}
		_tuple = Syscall(0, (fd >>> 0), _p0, (p.length >>> 0)); r0 = _tuple[0]; e1 = _tuple[2];
		n = (r0 >> 0);
		if (!((e1 === 0))) {
			err = new Errno(e1);
		}
		return [n, err];
	};
	write = function(fd, p) {
		var n, err, _p0, _tuple, r0, e1;
		n = 0;
		err = null;
		_p0 = 0;
		if (p.length > 0) {
			_p0 = $sliceToArray(p);
		} else {
			_p0 = new Uint8Array(0);
		}
		_tuple = Syscall(1, (fd >>> 0), _p0, (p.length >>> 0)); r0 = _tuple[0]; e1 = _tuple[2];
		n = (r0 >> 0);
		if (!((e1 === 0))) {
			err = new Errno(e1);
		}
		return [n, err];
	};
	munmap = function(addr, length) {
		var err, _tuple, e1;
		err = null;
		_tuple = Syscall(11, addr, length, 0); e1 = _tuple[2];
		if (!((e1 === 0))) {
			err = new Errno(e1);
		}
		return err;
	};
	Fchown = $pkg.Fchown = function(fd, uid, gid) {
		var err, _tuple, e1;
		err = null;
		_tuple = Syscall(93, (fd >>> 0), (uid >>> 0), (gid >>> 0)); e1 = _tuple[2];
		if (!((e1 === 0))) {
			err = new Errno(e1);
		}
		return err;
	};
	Fstat = $pkg.Fstat = function(fd, stat) {
		var err, _tuple, _array, _struct, _view, e1;
		err = null;
		_array = new Uint8Array(144);
		_tuple = Syscall(5, (fd >>> 0), _array, 0); e1 = _tuple[2];
		_struct = stat, _view = new DataView(_array.buffer, _array.byteOffset), _struct.Dev = new $Uint64(_view.getUint32(4, true), _view.getUint32(0, true)), _struct.Ino = new $Uint64(_view.getUint32(12, true), _view.getUint32(8, true)), _struct.Nlink = new $Uint64(_view.getUint32(20, true), _view.getUint32(16, true)), _struct.Mode = _view.getUint32(24, true), _struct.Uid = _view.getUint32(28, true), _struct.Gid = _view.getUint32(32, true), _struct.X__pad0 = _view.getInt32(36, true), _struct.Rdev = new $Uint64(_view.getUint32(44, true), _view.getUint32(40, true)), _struct.Size = new $Int64(_view.getUint32(52, true), _view.getUint32(48, true)), _struct.Blksize = new $Int64(_view.getUint32(60, true), _view.getUint32(56, true)), _struct.Blocks = new $Int64(_view.getUint32(68, true), _view.getUint32(64, true)), _struct.Atim.Sec = new $Int64(_view.getUint32(76, true), _view.getUint32(72, true)), _struct.Atim.Nsec = new $Int64(_view.getUint32(84, true), _view.getUint32(80, true)), _struct.Mtim.Sec = new $Int64(_view.getUint32(92, true), _view.getUint32(88, true)), _struct.Mtim.Nsec = new $Int64(_view.getUint32(100, true), _view.getUint32(96, true)), _struct.Ctim.Sec = new $Int64(_view.getUint32(108, true), _view.getUint32(104, true)), _struct.Ctim.Nsec = new $Int64(_view.getUint32(116, true), _view.getUint32(112, true)), _struct.X__unused = new ($nativeArray("Int64"))(_array.buffer, $min(_array.byteOffset + 120, _array.buffer.byteLength));
		if (!((e1 === 0))) {
			err = new Errno(e1);
		}
		return err;
	};
	Ftruncate = $pkg.Ftruncate = function(fd, length) {
		var err, _tuple, e1;
		err = null;
		_tuple = Syscall(77, (fd >>> 0), (length.low >>> 0), 0); e1 = _tuple[2];
		if (!((e1 === 0))) {
			err = new Errno(e1);
		}
		return err;
	};
	Lstat = $pkg.Lstat = function(path, stat) {
		var err, _p0, _tuple, _tuple$1, _array, _struct, _view, e1;
		err = null;
		_p0 = ($ptrType($Uint8)).nil;
		_tuple = BytePtrFromString(path); _p0 = _tuple[0]; err = _tuple[1];
		if (!($interfaceIsEqual(err, null))) {
			return err;
		}
		_array = new Uint8Array(144);
		_tuple$1 = Syscall(6, _p0, _array, 0); e1 = _tuple$1[2];
		_struct = stat, _view = new DataView(_array.buffer, _array.byteOffset), _struct.Dev = new $Uint64(_view.getUint32(4, true), _view.getUint32(0, true)), _struct.Ino = new $Uint64(_view.getUint32(12, true), _view.getUint32(8, true)), _struct.Nlink = new $Uint64(_view.getUint32(20, true), _view.getUint32(16, true)), _struct.Mode = _view.getUint32(24, true), _struct.Uid = _view.getUint32(28, true), _struct.Gid = _view.getUint32(32, true), _struct.X__pad0 = _view.getInt32(36, true), _struct.Rdev = new $Uint64(_view.getUint32(44, true), _view.getUint32(40, true)), _struct.Size = new $Int64(_view.getUint32(52, true), _view.getUint32(48, true)), _struct.Blksize = new $Int64(_view.getUint32(60, true), _view.getUint32(56, true)), _struct.Blocks = new $Int64(_view.getUint32(68, true), _view.getUint32(64, true)), _struct.Atim.Sec = new $Int64(_view.getUint32(76, true), _view.getUint32(72, true)), _struct.Atim.Nsec = new $Int64(_view.getUint32(84, true), _view.getUint32(80, true)), _struct.Mtim.Sec = new $Int64(_view.getUint32(92, true), _view.getUint32(88, true)), _struct.Mtim.Nsec = new $Int64(_view.getUint32(100, true), _view.getUint32(96, true)), _struct.Ctim.Sec = new $Int64(_view.getUint32(108, true), _view.getUint32(104, true)), _struct.Ctim.Nsec = new $Int64(_view.getUint32(116, true), _view.getUint32(112, true)), _struct.X__unused = new ($nativeArray("Int64"))(_array.buffer, $min(_array.byteOffset + 120, _array.buffer.byteLength));
		if (!((e1 === 0))) {
			err = new Errno(e1);
		}
		return err;
	};
	Pread = $pkg.Pread = function(fd, p, offset) {
		var n, err, _p0, _tuple, r0, e1;
		n = 0;
		err = null;
		_p0 = 0;
		if (p.length > 0) {
			_p0 = $sliceToArray(p);
		} else {
			_p0 = new Uint8Array(0);
		}
		_tuple = Syscall6(17, (fd >>> 0), _p0, (p.length >>> 0), (offset.low >>> 0), 0, 0); r0 = _tuple[0]; e1 = _tuple[2];
		n = (r0 >> 0);
		if (!((e1 === 0))) {
			err = new Errno(e1);
		}
		return [n, err];
	};
	Pwrite = $pkg.Pwrite = function(fd, p, offset) {
		var n, err, _p0, _tuple, r0, e1;
		n = 0;
		err = null;
		_p0 = 0;
		if (p.length > 0) {
			_p0 = $sliceToArray(p);
		} else {
			_p0 = new Uint8Array(0);
		}
		_tuple = Syscall6(18, (fd >>> 0), _p0, (p.length >>> 0), (offset.low >>> 0), 0, 0); r0 = _tuple[0]; e1 = _tuple[2];
		n = (r0 >> 0);
		if (!((e1 === 0))) {
			err = new Errno(e1);
		}
		return [n, err];
	};
	Seek = $pkg.Seek = function(fd, offset, whence) {
		var off, err, _tuple, r0, e1;
		off = new $Int64(0, 0);
		err = null;
		_tuple = Syscall(8, (fd >>> 0), (offset.low >>> 0), (whence >>> 0)); r0 = _tuple[0]; e1 = _tuple[2];
		off = new $Int64(0, r0.constructor === Number ? r0 : 1);
		if (!((e1 === 0))) {
			err = new Errno(e1);
		}
		return [off, err];
	};
	mmap = function(addr, length, prot, flags, fd, offset) {
		var xaddr, err, _tuple, r0, e1;
		xaddr = 0;
		err = null;
		_tuple = Syscall6(9, addr, length, (prot >>> 0), (flags >>> 0), (fd >>> 0), (offset.low >>> 0)); r0 = _tuple[0]; e1 = _tuple[2];
		xaddr = r0;
		if (!((e1 === 0))) {
			err = new Errno(e1);
		}
		return [xaddr, err];
	};
	$pkg.init = function() {
		($ptrType(mmapper)).methods = [["Lock", "Lock", "", [], [], false, 0], ["Mmap", "Mmap", "", [$Int, $Int64, $Int, $Int, $Int], [($sliceType($Uint8)), $error], false, -1], ["Munmap", "Munmap", "", [($sliceType($Uint8))], [$error], false, -1], ["Unlock", "Unlock", "", [], [], false, 0]];
		mmapper.init([["Mutex", "", "", sync.Mutex, ""], ["active", "active", "syscall", ($mapType(($ptrType($Uint8)), ($sliceType($Uint8)))), ""], ["mmap", "mmap", "syscall", ($funcType([$Uintptr, $Uintptr, $Int, $Int, $Int, $Int64], [$Uintptr, $error], false)), ""], ["munmap", "munmap", "syscall", ($funcType([$Uintptr, $Uintptr], [$error], false)), ""]]);
		Errno.methods = [["Error", "Error", "", [], [$String], false, -1], ["Temporary", "Temporary", "", [], [$Bool], false, -1], ["Timeout", "Timeout", "", [], [$Bool], false, -1]];
		($ptrType(Errno)).methods = [["Error", "Error", "", [], [$String], false, -1], ["Temporary", "Temporary", "", [], [$Bool], false, -1], ["Timeout", "Timeout", "", [], [$Bool], false, -1]];
		($ptrType(Timespec)).methods = [["Nano", "Nano", "", [], [$Int64], false, -1], ["Unix", "Unix", "", [], [$Int64, $Int64], false, -1]];
		Timespec.init([["Sec", "Sec", "", $Int64, ""], ["Nsec", "Nsec", "", $Int64, ""]]);
		Stat_t.init([["Dev", "Dev", "", $Uint64, ""], ["Ino", "Ino", "", $Uint64, ""], ["Nlink", "Nlink", "", $Uint64, ""], ["Mode", "Mode", "", $Uint32, ""], ["Uid", "Uid", "", $Uint32, ""], ["Gid", "Gid", "", $Uint32, ""], ["X__pad0", "X__pad0", "", $Int32, ""], ["Rdev", "Rdev", "", $Uint64, ""], ["Size", "Size", "", $Int64, ""], ["Blksize", "Blksize", "", $Int64, ""], ["Blocks", "Blocks", "", $Int64, ""], ["Atim", "Atim", "", Timespec, ""], ["Mtim", "Mtim", "", Timespec, ""], ["Ctim", "Ctim", "", Timespec, ""], ["X__unused", "X__unused", "", ($arrayType($Int64, 3)), ""]]);
		Dirent.init([["Ino", "Ino", "", $Uint64, ""], ["Off", "Off", "", $Int64, ""], ["Reclen", "Reclen", "", $Uint16, ""], ["Type", "Type", "", $Uint8, ""], ["Name", "Name", "", ($arrayType($Int8, 256)), ""], ["Pad_cgo_0", "Pad_cgo_0", "", ($arrayType($Uint8, 5)), ""]]);
		lineBuffer = ($sliceType($Uint8)).nil;
		syscallModule = null;
		envOnce = new sync.Once.Ptr();
		envLock = new sync.RWMutex.Ptr();
		env = false;
		envs = ($sliceType($String)).nil;
		warningPrinted = false;
		alreadyTriedToLoad = false;
		minusOne = -1;
		mapper = new mmapper.Ptr(new sync.Mutex.Ptr(), new $Map(), mmap, munmap);
		$pkg.Stdin = 0;
		$pkg.Stdout = 1;
		$pkg.Stderr = 2;
		errors = $toNativeArray("String", ["", "operation not permitted", "no such file or directory", "no such process", "interrupted system call", "input/output error", "no such device or address", "argument list too long", "exec format error", "bad file descriptor", "no child processes", "resource temporarily unavailable", "cannot allocate memory", "permission denied", "bad address", "block device required", "device or resource busy", "file exists", "invalid cross-device link", "no such device", "not a directory", "is a directory", "invalid argument", "too many open files in system", "too many open files", "inappropriate ioctl for device", "text file busy", "file too large", "no space left on device", "illegal seek", "read-only file system", "too many links", "broken pipe", "numerical argument out of domain", "numerical result out of range", "resource deadlock avoided", "file name too long", "no locks available", "function not implemented", "directory not empty", "too many levels of symbolic links", "", "no message of desired type", "identifier removed", "channel number out of range", "level 2 not synchronized", "level 3 halted", "level 3 reset", "link number out of range", "protocol driver not attached", "no CSI structure available", "level 2 halted", "invalid exchange", "invalid request descriptor", "exchange full", "no anode", "invalid request code", "invalid slot", "", "bad font file format", "device not a stream", "no data available", "timer expired", "out of streams resources", "machine is not on the network", "package not installed", "object is remote", "link has been severed", "advertise error", "srmount error", "communication error on send", "protocol error", "multihop attempted", "RFS specific error", "bad message", "value too large for defined data type", "name not unique on network", "file descriptor in bad state", "remote address changed", "can not access a needed shared library", "accessing a corrupted shared library", ".lib section in a.out corrupted", "attempting to link in too many shared libraries", "cannot exec a shared library directly", "invalid or incomplete multibyte or wide character", "interrupted system call should be restarted", "streams pipe error", "too many users", "socket operation on non-socket", "destination address required", "message too long", "protocol wrong type for socket", "protocol not available", "protocol not supported", "socket type not supported", "operation not supported", "protocol family not supported", "address family not supported by protocol", "address already in use", "cannot assign requested address", "network is down", "network is unreachable", "network dropped connection on reset", "software caused connection abort", "connection reset by peer", "no buffer space available", "transport endpoint is already connected", "transport endpoint is not connected", "cannot send after transport endpoint shutdown", "too many references: cannot splice", "connection timed out", "connection refused", "host is down", "no route to host", "operation already in progress", "operation now in progress", "stale NFS file handle", "structure needs cleaning", "not a XENIX named type file", "no XENIX semaphores available", "is a named type file", "remote I/O error", "disk quota exceeded", "no medium found", "wrong medium type", "operation canceled", "required key not available", "key has expired", "key has been revoked", "key was rejected by service", "owner died", "state not recoverable", "operation not possible due to RF-kill"]);
		var process, jsEnv, envkeys, i, key;
		process = $global.process;
		if (!(process === undefined)) {
			jsEnv = process.env;
			envkeys = $global.Object.keys(jsEnv);
			envs = ($sliceType($String)).make($parseInt(envkeys.length), 0, function() { return ""; });
			i = 0;
			while (i < $parseInt(envkeys.length)) {
				key = $internalize(envkeys[i], $String);
				(i < 0 || i >= envs.length) ? $throwRuntimeError("index out of range") : envs.array[envs.offset + i] = key + "=" + $internalize(jsEnv[$externalize(key, $String)], $String);
				i = i + 1 >> 0;
			}
		}
	};
	return $pkg;
})();
$packages["time"] = (function() {
	var $pkg = {}, js = $packages["github.com/gopherjs/gopherjs/js"], errors = $packages["errors"], syscall = $packages["syscall"], sync = $packages["sync"], runtime = $packages["runtime"], ParseError, Time, Month, Weekday, Duration, Location, zone, zoneTrans, data, now, startsWithLowerCase, nextStdChunk, match, lookup, appendUint, atoi, formatNano, quote, isDigit, getnum, cutspace, skip, Parse, parse, parseTimeZone, parseGMT, parseNanoseconds, leadingInt, readFile, open, closefd, preadn, absWeekday, absClock, fmtFrac, fmtInt, absDate, Unix, isLeap, norm, Date, div, FixedZone, byteString, loadZoneData, loadZoneFile, get4, get2, loadZoneZip, initLocal, loadLocation, std0x, longDayNames, shortDayNames, shortMonthNames, longMonthNames, atoiError, errBad, errLeadingInt, months, days, daysBefore, utcLoc, localLoc, localOnce, zoneinfo, badData, zoneDirs;
	ParseError = $pkg.ParseError = $newType(0, "Struct", "time.ParseError", "ParseError", "time", function(Layout_, Value_, LayoutElem_, ValueElem_, Message_) {
		this.$val = this;
		this.Layout = Layout_ !== undefined ? Layout_ : "";
		this.Value = Value_ !== undefined ? Value_ : "";
		this.LayoutElem = LayoutElem_ !== undefined ? LayoutElem_ : "";
		this.ValueElem = ValueElem_ !== undefined ? ValueElem_ : "";
		this.Message = Message_ !== undefined ? Message_ : "";
	});
	Time = $pkg.Time = $newType(0, "Struct", "time.Time", "Time", "time", function(sec_, nsec_, loc_) {
		this.$val = this;
		this.sec = sec_ !== undefined ? sec_ : new $Int64(0, 0);
		this.nsec = nsec_ !== undefined ? nsec_ : 0;
		this.loc = loc_ !== undefined ? loc_ : ($ptrType(Location)).nil;
	});
	Month = $pkg.Month = $newType(4, "Int", "time.Month", "Month", "time", null);
	Weekday = $pkg.Weekday = $newType(4, "Int", "time.Weekday", "Weekday", "time", null);
	Duration = $pkg.Duration = $newType(8, "Int64", "time.Duration", "Duration", "time", null);
	Location = $pkg.Location = $newType(0, "Struct", "time.Location", "Location", "time", function(name_, zone_, tx_, cacheStart_, cacheEnd_, cacheZone_) {
		this.$val = this;
		this.name = name_ !== undefined ? name_ : "";
		this.zone = zone_ !== undefined ? zone_ : ($sliceType(zone)).nil;
		this.tx = tx_ !== undefined ? tx_ : ($sliceType(zoneTrans)).nil;
		this.cacheStart = cacheStart_ !== undefined ? cacheStart_ : new $Int64(0, 0);
		this.cacheEnd = cacheEnd_ !== undefined ? cacheEnd_ : new $Int64(0, 0);
		this.cacheZone = cacheZone_ !== undefined ? cacheZone_ : ($ptrType(zone)).nil;
	});
	zone = $pkg.zone = $newType(0, "Struct", "time.zone", "zone", "time", function(name_, offset_, isDST_) {
		this.$val = this;
		this.name = name_ !== undefined ? name_ : "";
		this.offset = offset_ !== undefined ? offset_ : 0;
		this.isDST = isDST_ !== undefined ? isDST_ : false;
	});
	zoneTrans = $pkg.zoneTrans = $newType(0, "Struct", "time.zoneTrans", "zoneTrans", "time", function(when_, index_, isstd_, isutc_) {
		this.$val = this;
		this.when = when_ !== undefined ? when_ : new $Int64(0, 0);
		this.index = index_ !== undefined ? index_ : 0;
		this.isstd = isstd_ !== undefined ? isstd_ : false;
		this.isutc = isutc_ !== undefined ? isutc_ : false;
	});
	data = $pkg.data = $newType(0, "Struct", "time.data", "data", "time", function(p_, error_) {
		this.$val = this;
		this.p = p_ !== undefined ? p_ : ($sliceType($Uint8)).nil;
		this.error = error_ !== undefined ? error_ : false;
	});
	now = function() {
		var sec, nsec, msec, _tmp, _tmp$1, x, x$1;
		sec = new $Int64(0, 0);
		nsec = 0;
		msec = $internalize(new ($global.Date)().getTime(), $Int64);
		_tmp = $div64(msec, new $Int64(0, 1000), false); _tmp$1 = (x = ((x$1 = $div64(msec, new $Int64(0, 1000), true), x$1.low + ((x$1.high >> 31) * 4294967296)) >> 0), (((x >>> 16 << 16) * 1000000 >> 0) + (x << 16 >>> 16) * 1000000) >> 0); sec = _tmp; nsec = _tmp$1;
		return [sec, nsec];
	};
	startsWithLowerCase = function(str) {
		var c;
		if (str.length === 0) {
			return false;
		}
		c = str.charCodeAt(0);
		return 97 <= c && c <= 122;
	};
	nextStdChunk = function(layout) {
		var prefix, std, suffix, i, c, _ref, _tmp, _tmp$1, _tmp$2, _tmp$3, _tmp$4, _tmp$5, _tmp$6, _tmp$7, _tmp$8, _tmp$9, _tmp$10, _tmp$11, _tmp$12, _tmp$13, _tmp$14, _tmp$15, _tmp$16, _tmp$17, _tmp$18, _tmp$19, _tmp$20, _tmp$21, _tmp$22, _tmp$23, _tmp$24, _tmp$25, _tmp$26, _tmp$27, _tmp$28, _tmp$29, _tmp$30, _tmp$31, _tmp$32, _tmp$33, _tmp$34, _tmp$35, _tmp$36, _tmp$37, _tmp$38, _tmp$39, _tmp$40, _tmp$41, _tmp$42, _tmp$43, _tmp$44, _tmp$45, _tmp$46, _tmp$47, _tmp$48, _tmp$49, _tmp$50, _tmp$51, _tmp$52, _tmp$53, _tmp$54, _tmp$55, _tmp$56, _tmp$57, _tmp$58, _tmp$59, _tmp$60, _tmp$61, _tmp$62, _tmp$63, _tmp$64, _tmp$65, _tmp$66, _tmp$67, _tmp$68, _tmp$69, _tmp$70, _tmp$71, _tmp$72, _tmp$73, _tmp$74, ch, j, std$1, _tmp$75, _tmp$76, _tmp$77, _tmp$78, _tmp$79, _tmp$80;
		prefix = "";
		std = 0;
		suffix = "";
		i = 0;
		while (i < layout.length) {
			c = (layout.charCodeAt(i) >> 0);
			_ref = c;
			if (_ref === 74) {
				if (layout.length >= (i + 3 >> 0) && layout.substring(i, (i + 3 >> 0)) === "Jan") {
					if (layout.length >= (i + 7 >> 0) && layout.substring(i, (i + 7 >> 0)) === "January") {
						_tmp = layout.substring(0, i); _tmp$1 = 257; _tmp$2 = layout.substring((i + 7 >> 0)); prefix = _tmp; std = _tmp$1; suffix = _tmp$2;
						return [prefix, std, suffix];
					}
					if (!startsWithLowerCase(layout.substring((i + 3 >> 0)))) {
						_tmp$3 = layout.substring(0, i); _tmp$4 = 258; _tmp$5 = layout.substring((i + 3 >> 0)); prefix = _tmp$3; std = _tmp$4; suffix = _tmp$5;
						return [prefix, std, suffix];
					}
				}
			} else if (_ref === 77) {
				if (layout.length >= (i + 3 >> 0)) {
					if (layout.substring(i, (i + 3 >> 0)) === "Mon") {
						if (layout.length >= (i + 6 >> 0) && layout.substring(i, (i + 6 >> 0)) === "Monday") {
							_tmp$6 = layout.substring(0, i); _tmp$7 = 261; _tmp$8 = layout.substring((i + 6 >> 0)); prefix = _tmp$6; std = _tmp$7; suffix = _tmp$8;
							return [prefix, std, suffix];
						}
						if (!startsWithLowerCase(layout.substring((i + 3 >> 0)))) {
							_tmp$9 = layout.substring(0, i); _tmp$10 = 262; _tmp$11 = layout.substring((i + 3 >> 0)); prefix = _tmp$9; std = _tmp$10; suffix = _tmp$11;
							return [prefix, std, suffix];
						}
					}
					if (layout.substring(i, (i + 3 >> 0)) === "MST") {
						_tmp$12 = layout.substring(0, i); _tmp$13 = 21; _tmp$14 = layout.substring((i + 3 >> 0)); prefix = _tmp$12; std = _tmp$13; suffix = _tmp$14;
						return [prefix, std, suffix];
					}
				}
			} else if (_ref === 48) {
				if (layout.length >= (i + 2 >> 0) && 49 <= layout.charCodeAt((i + 1 >> 0)) && layout.charCodeAt((i + 1 >> 0)) <= 54) {
					_tmp$15 = layout.substring(0, i); _tmp$16 = std0x[(layout.charCodeAt((i + 1 >> 0)) - 49 << 24 >>> 24)]; _tmp$17 = layout.substring((i + 2 >> 0)); prefix = _tmp$15; std = _tmp$16; suffix = _tmp$17;
					return [prefix, std, suffix];
				}
			} else if (_ref === 49) {
				if (layout.length >= (i + 2 >> 0) && (layout.charCodeAt((i + 1 >> 0)) === 53)) {
					_tmp$18 = layout.substring(0, i); _tmp$19 = 522; _tmp$20 = layout.substring((i + 2 >> 0)); prefix = _tmp$18; std = _tmp$19; suffix = _tmp$20;
					return [prefix, std, suffix];
				}
				_tmp$21 = layout.substring(0, i); _tmp$22 = 259; _tmp$23 = layout.substring((i + 1 >> 0)); prefix = _tmp$21; std = _tmp$22; suffix = _tmp$23;
				return [prefix, std, suffix];
			} else if (_ref === 50) {
				if (layout.length >= (i + 4 >> 0) && layout.substring(i, (i + 4 >> 0)) === "2006") {
					_tmp$24 = layout.substring(0, i); _tmp$25 = 273; _tmp$26 = layout.substring((i + 4 >> 0)); prefix = _tmp$24; std = _tmp$25; suffix = _tmp$26;
					return [prefix, std, suffix];
				}
				_tmp$27 = layout.substring(0, i); _tmp$28 = 263; _tmp$29 = layout.substring((i + 1 >> 0)); prefix = _tmp$27; std = _tmp$28; suffix = _tmp$29;
				return [prefix, std, suffix];
			} else if (_ref === 95) {
				if (layout.length >= (i + 2 >> 0) && (layout.charCodeAt((i + 1 >> 0)) === 50)) {
					_tmp$30 = layout.substring(0, i); _tmp$31 = 264; _tmp$32 = layout.substring((i + 2 >> 0)); prefix = _tmp$30; std = _tmp$31; suffix = _tmp$32;
					return [prefix, std, suffix];
				}
			} else if (_ref === 51) {
				_tmp$33 = layout.substring(0, i); _tmp$34 = 523; _tmp$35 = layout.substring((i + 1 >> 0)); prefix = _tmp$33; std = _tmp$34; suffix = _tmp$35;
				return [prefix, std, suffix];
			} else if (_ref === 52) {
				_tmp$36 = layout.substring(0, i); _tmp$37 = 525; _tmp$38 = layout.substring((i + 1 >> 0)); prefix = _tmp$36; std = _tmp$37; suffix = _tmp$38;
				return [prefix, std, suffix];
			} else if (_ref === 53) {
				_tmp$39 = layout.substring(0, i); _tmp$40 = 527; _tmp$41 = layout.substring((i + 1 >> 0)); prefix = _tmp$39; std = _tmp$40; suffix = _tmp$41;
				return [prefix, std, suffix];
			} else if (_ref === 80) {
				if (layout.length >= (i + 2 >> 0) && (layout.charCodeAt((i + 1 >> 0)) === 77)) {
					_tmp$42 = layout.substring(0, i); _tmp$43 = 531; _tmp$44 = layout.substring((i + 2 >> 0)); prefix = _tmp$42; std = _tmp$43; suffix = _tmp$44;
					return [prefix, std, suffix];
				}
			} else if (_ref === 112) {
				if (layout.length >= (i + 2 >> 0) && (layout.charCodeAt((i + 1 >> 0)) === 109)) {
					_tmp$45 = layout.substring(0, i); _tmp$46 = 532; _tmp$47 = layout.substring((i + 2 >> 0)); prefix = _tmp$45; std = _tmp$46; suffix = _tmp$47;
					return [prefix, std, suffix];
				}
			} else if (_ref === 45) {
				if (layout.length >= (i + 7 >> 0) && layout.substring(i, (i + 7 >> 0)) === "-070000") {
					_tmp$48 = layout.substring(0, i); _tmp$49 = 27; _tmp$50 = layout.substring((i + 7 >> 0)); prefix = _tmp$48; std = _tmp$49; suffix = _tmp$50;
					return [prefix, std, suffix];
				}
				if (layout.length >= (i + 9 >> 0) && layout.substring(i, (i + 9 >> 0)) === "-07:00:00") {
					_tmp$51 = layout.substring(0, i); _tmp$52 = 30; _tmp$53 = layout.substring((i + 9 >> 0)); prefix = _tmp$51; std = _tmp$52; suffix = _tmp$53;
					return [prefix, std, suffix];
				}
				if (layout.length >= (i + 5 >> 0) && layout.substring(i, (i + 5 >> 0)) === "-0700") {
					_tmp$54 = layout.substring(0, i); _tmp$55 = 26; _tmp$56 = layout.substring((i + 5 >> 0)); prefix = _tmp$54; std = _tmp$55; suffix = _tmp$56;
					return [prefix, std, suffix];
				}
				if (layout.length >= (i + 6 >> 0) && layout.substring(i, (i + 6 >> 0)) === "-07:00") {
					_tmp$57 = layout.substring(0, i); _tmp$58 = 29; _tmp$59 = layout.substring((i + 6 >> 0)); prefix = _tmp$57; std = _tmp$58; suffix = _tmp$59;
					return [prefix, std, suffix];
				}
				if (layout.length >= (i + 3 >> 0) && layout.substring(i, (i + 3 >> 0)) === "-07") {
					_tmp$60 = layout.substring(0, i); _tmp$61 = 28; _tmp$62 = layout.substring((i + 3 >> 0)); prefix = _tmp$60; std = _tmp$61; suffix = _tmp$62;
					return [prefix, std, suffix];
				}
			} else if (_ref === 90) {
				if (layout.length >= (i + 7 >> 0) && layout.substring(i, (i + 7 >> 0)) === "Z070000") {
					_tmp$63 = layout.substring(0, i); _tmp$64 = 23; _tmp$65 = layout.substring((i + 7 >> 0)); prefix = _tmp$63; std = _tmp$64; suffix = _tmp$65;
					return [prefix, std, suffix];
				}
				if (layout.length >= (i + 9 >> 0) && layout.substring(i, (i + 9 >> 0)) === "Z07:00:00") {
					_tmp$66 = layout.substring(0, i); _tmp$67 = 25; _tmp$68 = layout.substring((i + 9 >> 0)); prefix = _tmp$66; std = _tmp$67; suffix = _tmp$68;
					return [prefix, std, suffix];
				}
				if (layout.length >= (i + 5 >> 0) && layout.substring(i, (i + 5 >> 0)) === "Z0700") {
					_tmp$69 = layout.substring(0, i); _tmp$70 = 22; _tmp$71 = layout.substring((i + 5 >> 0)); prefix = _tmp$69; std = _tmp$70; suffix = _tmp$71;
					return [prefix, std, suffix];
				}
				if (layout.length >= (i + 6 >> 0) && layout.substring(i, (i + 6 >> 0)) === "Z07:00") {
					_tmp$72 = layout.substring(0, i); _tmp$73 = 24; _tmp$74 = layout.substring((i + 6 >> 0)); prefix = _tmp$72; std = _tmp$73; suffix = _tmp$74;
					return [prefix, std, suffix];
				}
			} else if (_ref === 46) {
				if ((i + 1 >> 0) < layout.length && ((layout.charCodeAt((i + 1 >> 0)) === 48) || (layout.charCodeAt((i + 1 >> 0)) === 57))) {
					ch = layout.charCodeAt((i + 1 >> 0));
					j = i + 1 >> 0;
					while (j < layout.length && (layout.charCodeAt(j) === ch)) {
						j = j + 1 >> 0;
					}
					if (!isDigit(layout, j)) {
						std$1 = 31;
						if (layout.charCodeAt((i + 1 >> 0)) === 57) {
							std$1 = 32;
						}
						std$1 = std$1 | ((((j - ((i + 1 >> 0)) >> 0)) << 16 >> 0));
						_tmp$75 = layout.substring(0, i); _tmp$76 = std$1; _tmp$77 = layout.substring(j); prefix = _tmp$75; std = _tmp$76; suffix = _tmp$77;
						return [prefix, std, suffix];
					}
				}
			}
			i = i + 1 >> 0;
		}
		_tmp$78 = layout; _tmp$79 = 0; _tmp$80 = ""; prefix = _tmp$78; std = _tmp$79; suffix = _tmp$80;
		return [prefix, std, suffix];
	};
	match = function(s1, s2) {
		var i, c1, c2;
		i = 0;
		while (i < s1.length) {
			c1 = s1.charCodeAt(i);
			c2 = s2.charCodeAt(i);
			if (!((c1 === c2))) {
				c1 = (c1 | 32) >>> 0;
				c2 = (c2 | 32) >>> 0;
				if (!((c1 === c2)) || c1 < 97 || c1 > 122) {
					return false;
				}
			}
			i = i + 1 >> 0;
		}
		return true;
	};
	lookup = function(tab, val) {
		var _ref, _i, v, i;
		_ref = tab;
		_i = 0;
		while (_i < _ref.length) {
			v = ((_i < 0 || _i >= _ref.length) ? $throwRuntimeError("index out of range") : _ref.array[_ref.offset + _i]);
			i = _i;
			if (val.length >= v.length && match(val.substring(0, v.length), v)) {
				return [i, val.substring(v.length), null];
			}
			_i++;
		}
		return [-1, val, errBad];
	};
	appendUint = function(b, x, pad) {
		var _q, _r, buf, n, _r$1, _q$1;
		if (x < 10) {
			if (!((pad === 0))) {
				b = $append(b, pad);
			}
			return $append(b, ((48 + x >>> 0) << 24 >>> 24));
		}
		if (x < 100) {
			b = $append(b, ((48 + (_q = x / 10, (_q === _q && _q !== 1/0 && _q !== -1/0) ? _q >>> 0 : $throwRuntimeError("integer divide by zero")) >>> 0) << 24 >>> 24));
			b = $append(b, ((48 + (_r = x % 10, _r === _r ? _r : $throwRuntimeError("integer divide by zero")) >>> 0) << 24 >>> 24));
			return b;
		}
		buf = $makeNativeArray("Uint8", 32, function() { return 0; });
		n = 32;
		if (x === 0) {
			return $append(b, 48);
		}
		while (x >= 10) {
			n = n - 1 >> 0;
			buf[n] = (((_r$1 = x % 10, _r$1 === _r$1 ? _r$1 : $throwRuntimeError("integer divide by zero")) + 48 >>> 0) << 24 >>> 24);
			x = (_q$1 = x / 10, (_q$1 === _q$1 && _q$1 !== 1/0 && _q$1 !== -1/0) ? _q$1 >>> 0 : $throwRuntimeError("integer divide by zero"));
		}
		n = n - 1 >> 0;
		buf[n] = ((x + 48 >>> 0) << 24 >>> 24);
		return $appendSlice(b, $subslice(new ($sliceType($Uint8))(buf), n));
	};
	atoi = function(s) {
		var x, err, neg, _tuple, q, rem, _tmp, _tmp$1, _tmp$2, _tmp$3;
		x = 0;
		err = null;
		neg = false;
		if (!(s === "") && ((s.charCodeAt(0) === 45) || (s.charCodeAt(0) === 43))) {
			neg = s.charCodeAt(0) === 45;
			s = s.substring(1);
		}
		_tuple = leadingInt(s); q = _tuple[0]; rem = _tuple[1]; err = _tuple[2];
		x = ((q.low + ((q.high >> 31) * 4294967296)) >> 0);
		if (!($interfaceIsEqual(err, null)) || !(rem === "")) {
			_tmp = 0; _tmp$1 = atoiError; x = _tmp; err = _tmp$1;
			return [x, err];
		}
		if (neg) {
			x = -x;
		}
		_tmp$2 = x; _tmp$3 = null; x = _tmp$2; err = _tmp$3;
		return [x, err];
	};
	formatNano = function(b, nanosec, n, trim) {
		var u, buf, start, _r, _q;
		u = nanosec;
		buf = $makeNativeArray("Uint8", 9, function() { return 0; });
		start = 9;
		while (start > 0) {
			start = start - 1 >> 0;
			buf[start] = (((_r = u % 10, _r === _r ? _r : $throwRuntimeError("integer divide by zero")) + 48 >>> 0) << 24 >>> 24);
			u = (_q = u / 10, (_q === _q && _q !== 1/0 && _q !== -1/0) ? _q >>> 0 : $throwRuntimeError("integer divide by zero"));
		}
		if (n > 9) {
			n = 9;
		}
		if (trim) {
			while (n > 0 && (buf[(n - 1 >> 0)] === 48)) {
				n = n - 1 >> 0;
			}
			if (n === 0) {
				return b;
			}
		}
		b = $append(b, 46);
		return $appendSlice(b, $subslice(new ($sliceType($Uint8))(buf), 0, n));
	};
	Time.Ptr.prototype.String = function() {
		var _struct, t;
		t = (_struct = this, new Time.Ptr(_struct.sec, _struct.nsec, _struct.loc));
		return t.Format("2006-01-02 15:04:05.999999999 -0700 MST");
	};
	Time.prototype.String = function() { return this.$val.String(); };
	Time.Ptr.prototype.Format = function(layout) {
		var _struct, t, _tuple, name, offset, abs, year, month, day, hour, min, sec, b, buf, max, _tuple$1, prefix, std, suffix, _tuple$2, _tuple$3, _ref, y, _r, y$1, m, s, _r$1, hr, _r$2, hr$1, _q, zone$1, absoffset, _q$1, _r$3, _r$4, _q$2, zone$2, _q$3, _r$5;
		t = (_struct = this, new Time.Ptr(_struct.sec, _struct.nsec, _struct.loc));
		_tuple = t.locabs(); name = _tuple[0]; offset = _tuple[1]; abs = _tuple[2];
		year = -1;
		month = 0;
		day = 0;
		hour = -1;
		min = 0;
		sec = 0;
		b = ($sliceType($Uint8)).nil;
		buf = $makeNativeArray("Uint8", 64, function() { return 0; });
		max = layout.length + 10 >> 0;
		if (max <= 64) {
			b = $subslice(new ($sliceType($Uint8))(buf), 0, 0);
		} else {
			b = ($sliceType($Uint8)).make(0, max, function() { return 0; });
		}
		while (!(layout === "")) {
			_tuple$1 = nextStdChunk(layout); prefix = _tuple$1[0]; std = _tuple$1[1]; suffix = _tuple$1[2];
			if (!(prefix === "")) {
				b = $appendSlice(b, new ($sliceType($Uint8))($stringToBytes(prefix)));
			}
			if (std === 0) {
				break;
			}
			layout = suffix;
			if (year < 0 && !(((std & 256) === 0))) {
				_tuple$2 = absDate(abs, true); year = _tuple$2[0]; month = _tuple$2[1]; day = _tuple$2[2];
			}
			if (hour < 0 && !(((std & 512) === 0))) {
				_tuple$3 = absClock(abs); hour = _tuple$3[0]; min = _tuple$3[1]; sec = _tuple$3[2];
			}
			_ref = std & 65535;
			switch (0) { default: if (_ref === 274) {
				y = year;
				if (y < 0) {
					y = -y;
				}
				b = appendUint(b, ((_r = y % 100, _r === _r ? _r : $throwRuntimeError("integer divide by zero")) >>> 0), 48);
			} else if (_ref === 273) {
				y$1 = year;
				if (year <= -1000) {
					b = $append(b, 45);
					y$1 = -y$1;
				} else if (year <= -100) {
					b = $appendSlice(b, new ($sliceType($Uint8))($stringToBytes("-0")));
					y$1 = -y$1;
				} else if (year <= -10) {
					b = $appendSlice(b, new ($sliceType($Uint8))($stringToBytes("-00")));
					y$1 = -y$1;
				} else if (year < 0) {
					b = $appendSlice(b, new ($sliceType($Uint8))($stringToBytes("-000")));
					y$1 = -y$1;
				} else if (year < 10) {
					b = $appendSlice(b, new ($sliceType($Uint8))($stringToBytes("000")));
				} else if (year < 100) {
					b = $appendSlice(b, new ($sliceType($Uint8))($stringToBytes("00")));
				} else if (year < 1000) {
					b = $append(b, 48);
				}
				b = appendUint(b, (y$1 >>> 0), 0);
			} else if (_ref === 258) {
				b = $appendSlice(b, new ($sliceType($Uint8))($stringToBytes((new Month(month)).String().substring(0, 3))));
			} else if (_ref === 257) {
				m = (new Month(month)).String();
				b = $appendSlice(b, new ($sliceType($Uint8))($stringToBytes(m)));
			} else if (_ref === 259) {
				b = appendUint(b, (month >>> 0), 0);
			} else if (_ref === 260) {
				b = appendUint(b, (month >>> 0), 48);
			} else if (_ref === 262) {
				b = $appendSlice(b, new ($sliceType($Uint8))($stringToBytes((new Weekday(absWeekday(abs))).String().substring(0, 3))));
			} else if (_ref === 261) {
				s = (new Weekday(absWeekday(abs))).String();
				b = $appendSlice(b, new ($sliceType($Uint8))($stringToBytes(s)));
			} else if (_ref === 263) {
				b = appendUint(b, (day >>> 0), 0);
			} else if (_ref === 264) {
				b = appendUint(b, (day >>> 0), 32);
			} else if (_ref === 265) {
				b = appendUint(b, (day >>> 0), 48);
			} else if (_ref === 522) {
				b = appendUint(b, (hour >>> 0), 48);
			} else if (_ref === 523) {
				hr = (_r$1 = hour % 12, _r$1 === _r$1 ? _r$1 : $throwRuntimeError("integer divide by zero"));
				if (hr === 0) {
					hr = 12;
				}
				b = appendUint(b, (hr >>> 0), 0);
			} else if (_ref === 524) {
				hr$1 = (_r$2 = hour % 12, _r$2 === _r$2 ? _r$2 : $throwRuntimeError("integer divide by zero"));
				if (hr$1 === 0) {
					hr$1 = 12;
				}
				b = appendUint(b, (hr$1 >>> 0), 48);
			} else if (_ref === 525) {
				b = appendUint(b, (min >>> 0), 0);
			} else if (_ref === 526) {
				b = appendUint(b, (min >>> 0), 48);
			} else if (_ref === 527) {
				b = appendUint(b, (sec >>> 0), 0);
			} else if (_ref === 528) {
				b = appendUint(b, (sec >>> 0), 48);
			} else if (_ref === 531) {
				if (hour >= 12) {
					b = $appendSlice(b, new ($sliceType($Uint8))($stringToBytes("PM")));
				} else {
					b = $appendSlice(b, new ($sliceType($Uint8))($stringToBytes("AM")));
				}
			} else if (_ref === 532) {
				if (hour >= 12) {
					b = $appendSlice(b, new ($sliceType($Uint8))($stringToBytes("pm")));
				} else {
					b = $appendSlice(b, new ($sliceType($Uint8))($stringToBytes("am")));
				}
			} else if (_ref === 22 || _ref === 24 || _ref === 23 || _ref === 25 || _ref === 26 || _ref === 29 || _ref === 27 || _ref === 30) {
				if ((offset === 0) && ((std === 22) || (std === 24) || (std === 23) || (std === 25))) {
					b = $append(b, 90);
					break;
				}
				zone$1 = (_q = offset / 60, (_q === _q && _q !== 1/0 && _q !== -1/0) ? _q >> 0 : $throwRuntimeError("integer divide by zero"));
				absoffset = offset;
				if (zone$1 < 0) {
					b = $append(b, 45);
					zone$1 = -zone$1;
					absoffset = -absoffset;
				} else {
					b = $append(b, 43);
				}
				b = appendUint(b, ((_q$1 = zone$1 / 60, (_q$1 === _q$1 && _q$1 !== 1/0 && _q$1 !== -1/0) ? _q$1 >> 0 : $throwRuntimeError("integer divide by zero")) >>> 0), 48);
				if ((std === 24) || (std === 29)) {
					b = $append(b, 58);
				}
				b = appendUint(b, ((_r$3 = zone$1 % 60, _r$3 === _r$3 ? _r$3 : $throwRuntimeError("integer divide by zero")) >>> 0), 48);
				if ((std === 23) || (std === 27) || (std === 30) || (std === 25)) {
					if ((std === 30) || (std === 25)) {
						b = $append(b, 58);
					}
					b = appendUint(b, ((_r$4 = absoffset % 60, _r$4 === _r$4 ? _r$4 : $throwRuntimeError("integer divide by zero")) >>> 0), 48);
				}
			} else if (_ref === 21) {
				if (!(name === "")) {
					b = $appendSlice(b, new ($sliceType($Uint8))($stringToBytes(name)));
					break;
				}
				zone$2 = (_q$2 = offset / 60, (_q$2 === _q$2 && _q$2 !== 1/0 && _q$2 !== -1/0) ? _q$2 >> 0 : $throwRuntimeError("integer divide by zero"));
				if (zone$2 < 0) {
					b = $append(b, 45);
					zone$2 = -zone$2;
				} else {
					b = $append(b, 43);
				}
				b = appendUint(b, ((_q$3 = zone$2 / 60, (_q$3 === _q$3 && _q$3 !== 1/0 && _q$3 !== -1/0) ? _q$3 >> 0 : $throwRuntimeError("integer divide by zero")) >>> 0), 48);
				b = appendUint(b, ((_r$5 = zone$2 % 60, _r$5 === _r$5 ? _r$5 : $throwRuntimeError("integer divide by zero")) >>> 0), 48);
			} else if (_ref === 31 || _ref === 32) {
				b = formatNano(b, (t.Nanosecond() >>> 0), std >> 16 >> 0, (std & 65535) === 32);
			} }
		}
		return $bytesToString(b);
	};
	Time.prototype.Format = function(layout) { return this.$val.Format(layout); };
	quote = function(s) {
		return "\"" + s + "\"";
	};
	ParseError.Ptr.prototype.Error = function() {
		var e;
		e = this;
		if (e.Message === "") {
			return "parsing time " + quote(e.Value) + " as " + quote(e.Layout) + ": cannot parse " + quote(e.ValueElem) + " as " + quote(e.LayoutElem);
		}
		return "parsing time " + quote(e.Value) + e.Message;
	};
	ParseError.prototype.Error = function() { return this.$val.Error(); };
	isDigit = function(s, i) {
		var c;
		if (s.length <= i) {
			return false;
		}
		c = s.charCodeAt(i);
		return 48 <= c && c <= 57;
	};
	getnum = function(s, fixed) {
		var x;
		if (!isDigit(s, 0)) {
			return [0, s, errBad];
		}
		if (!isDigit(s, 1)) {
			if (fixed) {
				return [0, s, errBad];
			}
			return [((s.charCodeAt(0) - 48 << 24 >>> 24) >> 0), s.substring(1), null];
		}
		return [(x = ((s.charCodeAt(0) - 48 << 24 >>> 24) >> 0), (((x >>> 16 << 16) * 10 >> 0) + (x << 16 >>> 16) * 10) >> 0) + ((s.charCodeAt(1) - 48 << 24 >>> 24) >> 0) >> 0, s.substring(2), null];
	};
	cutspace = function(s) {
		while (s.length > 0 && (s.charCodeAt(0) === 32)) {
			s = s.substring(1);
		}
		return s;
	};
	skip = function(value, prefix) {
		while (prefix.length > 0) {
			if (prefix.charCodeAt(0) === 32) {
				if (value.length > 0 && !((value.charCodeAt(0) === 32))) {
					return [value, errBad];
				}
				prefix = cutspace(prefix);
				value = cutspace(value);
				continue;
			}
			if ((value.length === 0) || !((value.charCodeAt(0) === prefix.charCodeAt(0)))) {
				return [value, errBad];
			}
			prefix = prefix.substring(1);
			value = value.substring(1);
		}
		return [value, null];
	};
	Parse = $pkg.Parse = function(layout, value) {
		return parse(layout, value, $pkg.UTC, $pkg.Local);
	};
	parse = function(layout, value, defaultLocation, local) {
		var _tmp, _tmp$1, alayout, avalue, rangeErrString, amSet, pmSet, year, month, day, hour, min, sec, nsec, z, zoneOffset, zoneName, err, _tuple, prefix, std, suffix, stdstr, _tuple$1, p, _ref, _tmp$2, _tmp$3, _tuple$2, _tmp$4, _tmp$5, _tuple$3, _tuple$4, _tuple$5, _tuple$6, _tuple$7, _tuple$8, _tuple$9, _tuple$10, _tuple$11, _tuple$12, _tuple$13, _tuple$14, n, _tuple$15, _tmp$6, _tmp$7, _ref$1, _tmp$8, _tmp$9, _ref$2, _tmp$10, _tmp$11, _tmp$12, _tmp$13, sign, hour$1, min$1, seconds, _tmp$14, _tmp$15, _tmp$16, _tmp$17, _tmp$18, _tmp$19, _tmp$20, _tmp$21, _tmp$22, _tmp$23, _tmp$24, _tmp$25, _tmp$26, _tmp$27, _tmp$28, _tmp$29, _tmp$30, _tmp$31, _tmp$32, _tmp$33, _tmp$34, _tmp$35, _tmp$36, _tmp$37, _tmp$38, _tmp$39, _tmp$40, _tmp$41, hr, mm, ss, _tuple$16, _tuple$17, _tuple$18, x, _ref$3, _tuple$19, n$1, ok, _tmp$42, _tmp$43, ndigit, _tuple$20, i, _tuple$21, _struct, _struct$1, t, x$1, x$2, _tuple$22, x$3, name, offset, _struct$2, _struct$3, _struct$4, t$1, _tuple$23, x$4, offset$1, ok$1, x$5, x$6, _struct$5, _tuple$24, _struct$6, _struct$7;
		_tmp = layout; _tmp$1 = value; alayout = _tmp; avalue = _tmp$1;
		rangeErrString = "";
		amSet = false;
		pmSet = false;
		year = 0;
		month = 1;
		day = 1;
		hour = 0;
		min = 0;
		sec = 0;
		nsec = 0;
		z = ($ptrType(Location)).nil;
		zoneOffset = -1;
		zoneName = "";
		while (true) {
			err = null;
			_tuple = nextStdChunk(layout); prefix = _tuple[0]; std = _tuple[1]; suffix = _tuple[2];
			stdstr = layout.substring(prefix.length, (layout.length - suffix.length >> 0));
			_tuple$1 = skip(value, prefix); value = _tuple$1[0]; err = _tuple$1[1];
			if (!($interfaceIsEqual(err, null))) {
				return [new Time.Ptr(new $Int64(0, 0), 0, ($ptrType(Location)).nil), new ParseError.Ptr(alayout, avalue, prefix, value, "")];
			}
			if (std === 0) {
				if (!((value.length === 0))) {
					return [new Time.Ptr(new $Int64(0, 0), 0, ($ptrType(Location)).nil), new ParseError.Ptr(alayout, avalue, "", value, ": extra text: " + value)];
				}
				break;
			}
			layout = suffix;
			p = "";
			_ref = std & 65535;
			switch (0) { default: if (_ref === 274) {
				if (value.length < 2) {
					err = errBad;
					break;
				}
				_tmp$2 = value.substring(0, 2); _tmp$3 = value.substring(2); p = _tmp$2; value = _tmp$3;
				_tuple$2 = atoi(p); year = _tuple$2[0]; err = _tuple$2[1];
				if (year >= 69) {
					year = year + 1900 >> 0;
				} else {
					year = year + 2000 >> 0;
				}
			} else if (_ref === 273) {
				if (value.length < 4 || !isDigit(value, 0)) {
					err = errBad;
					break;
				}
				_tmp$4 = value.substring(0, 4); _tmp$5 = value.substring(4); p = _tmp$4; value = _tmp$5;
				_tuple$3 = atoi(p); year = _tuple$3[0]; err = _tuple$3[1];
			} else if (_ref === 258) {
				_tuple$4 = lookup(shortMonthNames, value); month = _tuple$4[0]; value = _tuple$4[1]; err = _tuple$4[2];
			} else if (_ref === 257) {
				_tuple$5 = lookup(longMonthNames, value); month = _tuple$5[0]; value = _tuple$5[1]; err = _tuple$5[2];
			} else if (_ref === 259 || _ref === 260) {
				_tuple$6 = getnum(value, std === 260); month = _tuple$6[0]; value = _tuple$6[1]; err = _tuple$6[2];
				if (month <= 0 || 12 < month) {
					rangeErrString = "month";
				}
			} else if (_ref === 262) {
				_tuple$7 = lookup(shortDayNames, value); value = _tuple$7[1]; err = _tuple$7[2];
			} else if (_ref === 261) {
				_tuple$8 = lookup(longDayNames, value); value = _tuple$8[1]; err = _tuple$8[2];
			} else if (_ref === 263 || _ref === 264 || _ref === 265) {
				if ((std === 264) && value.length > 0 && (value.charCodeAt(0) === 32)) {
					value = value.substring(1);
				}
				_tuple$9 = getnum(value, std === 265); day = _tuple$9[0]; value = _tuple$9[1]; err = _tuple$9[2];
				if (day < 0 || 31 < day) {
					rangeErrString = "day";
				}
			} else if (_ref === 522) {
				_tuple$10 = getnum(value, false); hour = _tuple$10[0]; value = _tuple$10[1]; err = _tuple$10[2];
				if (hour < 0 || 24 <= hour) {
					rangeErrString = "hour";
				}
			} else if (_ref === 523 || _ref === 524) {
				_tuple$11 = getnum(value, std === 524); hour = _tuple$11[0]; value = _tuple$11[1]; err = _tuple$11[2];
				if (hour < 0 || 12 < hour) {
					rangeErrString = "hour";
				}
			} else if (_ref === 525 || _ref === 526) {
				_tuple$12 = getnum(value, std === 526); min = _tuple$12[0]; value = _tuple$12[1]; err = _tuple$12[2];
				if (min < 0 || 60 <= min) {
					rangeErrString = "minute";
				}
			} else if (_ref === 527 || _ref === 528) {
				_tuple$13 = getnum(value, std === 528); sec = _tuple$13[0]; value = _tuple$13[1]; err = _tuple$13[2];
				if (sec < 0 || 60 <= sec) {
					rangeErrString = "second";
				}
				if (value.length >= 2 && (value.charCodeAt(0) === 46) && isDigit(value, 1)) {
					_tuple$14 = nextStdChunk(layout); std = _tuple$14[1];
					std = std & 65535;
					if ((std === 31) || (std === 32)) {
						break;
					}
					n = 2;
					while (n < value.length && isDigit(value, n)) {
						n = n + 1 >> 0;
					}
					_tuple$15 = parseNanoseconds(value, n); nsec = _tuple$15[0]; rangeErrString = _tuple$15[1]; err = _tuple$15[2];
					value = value.substring(n);
				}
			} else if (_ref === 531) {
				if (value.length < 2) {
					err = errBad;
					break;
				}
				_tmp$6 = value.substring(0, 2); _tmp$7 = value.substring(2); p = _tmp$6; value = _tmp$7;
				_ref$1 = p;
				if (_ref$1 === "PM") {
					pmSet = true;
				} else if (_ref$1 === "AM") {
					amSet = true;
				} else {
					err = errBad;
				}
			} else if (_ref === 532) {
				if (value.length < 2) {
					err = errBad;
					break;
				}
				_tmp$8 = value.substring(0, 2); _tmp$9 = value.substring(2); p = _tmp$8; value = _tmp$9;
				_ref$2 = p;
				if (_ref$2 === "pm") {
					pmSet = true;
				} else if (_ref$2 === "am") {
					amSet = true;
				} else {
					err = errBad;
				}
			} else if (_ref === 22 || _ref === 24 || _ref === 23 || _ref === 25 || _ref === 26 || _ref === 28 || _ref === 29 || _ref === 27 || _ref === 30) {
				if (((std === 22) || (std === 24)) && value.length >= 1 && (value.charCodeAt(0) === 90)) {
					value = value.substring(1);
					z = $pkg.UTC;
					break;
				}
				_tmp$10 = ""; _tmp$11 = ""; _tmp$12 = ""; _tmp$13 = ""; sign = _tmp$10; hour$1 = _tmp$11; min$1 = _tmp$12; seconds = _tmp$13;
				if ((std === 24) || (std === 29)) {
					if (value.length < 6) {
						err = errBad;
						break;
					}
					if (!((value.charCodeAt(3) === 58))) {
						err = errBad;
						break;
					}
					_tmp$14 = value.substring(0, 1); _tmp$15 = value.substring(1, 3); _tmp$16 = value.substring(4, 6); _tmp$17 = "00"; _tmp$18 = value.substring(6); sign = _tmp$14; hour$1 = _tmp$15; min$1 = _tmp$16; seconds = _tmp$17; value = _tmp$18;
				} else if (std === 28) {
					if (value.length < 3) {
						err = errBad;
						break;
					}
					_tmp$19 = value.substring(0, 1); _tmp$20 = value.substring(1, 3); _tmp$21 = "00"; _tmp$22 = "00"; _tmp$23 = value.substring(3); sign = _tmp$19; hour$1 = _tmp$20; min$1 = _tmp$21; seconds = _tmp$22; value = _tmp$23;
				} else if ((std === 25) || (std === 30)) {
					if (value.length < 9) {
						err = errBad;
						break;
					}
					if (!((value.charCodeAt(3) === 58)) || !((value.charCodeAt(6) === 58))) {
						err = errBad;
						break;
					}
					_tmp$24 = value.substring(0, 1); _tmp$25 = value.substring(1, 3); _tmp$26 = value.substring(4, 6); _tmp$27 = value.substring(7, 9); _tmp$28 = value.substring(9); sign = _tmp$24; hour$1 = _tmp$25; min$1 = _tmp$26; seconds = _tmp$27; value = _tmp$28;
				} else if ((std === 23) || (std === 27)) {
					if (value.length < 7) {
						err = errBad;
						break;
					}
					_tmp$29 = value.substring(0, 1); _tmp$30 = value.substring(1, 3); _tmp$31 = value.substring(3, 5); _tmp$32 = value.substring(5, 7); _tmp$33 = value.substring(7); sign = _tmp$29; hour$1 = _tmp$30; min$1 = _tmp$31; seconds = _tmp$32; value = _tmp$33;
				} else {
					if (value.length < 5) {
						err = errBad;
						break;
					}
					_tmp$34 = value.substring(0, 1); _tmp$35 = value.substring(1, 3); _tmp$36 = value.substring(3, 5); _tmp$37 = "00"; _tmp$38 = value.substring(5); sign = _tmp$34; hour$1 = _tmp$35; min$1 = _tmp$36; seconds = _tmp$37; value = _tmp$38;
				}
				_tmp$39 = 0; _tmp$40 = 0; _tmp$41 = 0; hr = _tmp$39; mm = _tmp$40; ss = _tmp$41;
				_tuple$16 = atoi(hour$1); hr = _tuple$16[0]; err = _tuple$16[1];
				if ($interfaceIsEqual(err, null)) {
					_tuple$17 = atoi(min$1); mm = _tuple$17[0]; err = _tuple$17[1];
				}
				if ($interfaceIsEqual(err, null)) {
					_tuple$18 = atoi(seconds); ss = _tuple$18[0]; err = _tuple$18[1];
				}
				zoneOffset = (x = (((((hr >>> 16 << 16) * 60 >> 0) + (hr << 16 >>> 16) * 60) >> 0) + mm >> 0), (((x >>> 16 << 16) * 60 >> 0) + (x << 16 >>> 16) * 60) >> 0) + ss >> 0;
				_ref$3 = sign.charCodeAt(0);
				if (_ref$3 === 43) {
				} else if (_ref$3 === 45) {
					zoneOffset = -zoneOffset;
				} else {
					err = errBad;
				}
			} else if (_ref === 21) {
				if (value.length >= 3 && value.substring(0, 3) === "UTC") {
					z = $pkg.UTC;
					value = value.substring(3);
					break;
				}
				_tuple$19 = parseTimeZone(value); n$1 = _tuple$19[0]; ok = _tuple$19[1];
				if (!ok) {
					err = errBad;
					break;
				}
				_tmp$42 = value.substring(0, n$1); _tmp$43 = value.substring(n$1); zoneName = _tmp$42; value = _tmp$43;
			} else if (_ref === 31) {
				ndigit = 1 + ((std >> 16 >> 0)) >> 0;
				if (value.length < ndigit) {
					err = errBad;
					break;
				}
				_tuple$20 = parseNanoseconds(value, ndigit); nsec = _tuple$20[0]; rangeErrString = _tuple$20[1]; err = _tuple$20[2];
				value = value.substring(ndigit);
			} else if (_ref === 32) {
				if (value.length < 2 || !((value.charCodeAt(0) === 46)) || value.charCodeAt(1) < 48 || 57 < value.charCodeAt(1)) {
					break;
				}
				i = 0;
				while (i < 9 && (i + 1 >> 0) < value.length && 48 <= value.charCodeAt((i + 1 >> 0)) && value.charCodeAt((i + 1 >> 0)) <= 57) {
					i = i + 1 >> 0;
				}
				_tuple$21 = parseNanoseconds(value, 1 + i >> 0); nsec = _tuple$21[0]; rangeErrString = _tuple$21[1]; err = _tuple$21[2];
				value = value.substring((1 + i >> 0));
			} }
			if (!(rangeErrString === "")) {
				return [new Time.Ptr(new $Int64(0, 0), 0, ($ptrType(Location)).nil), new ParseError.Ptr(alayout, avalue, stdstr, value, ": " + rangeErrString + " out of range")];
			}
			if (!($interfaceIsEqual(err, null))) {
				return [new Time.Ptr(new $Int64(0, 0), 0, ($ptrType(Location)).nil), new ParseError.Ptr(alayout, avalue, stdstr, value, "")];
			}
		}
		if (pmSet && hour < 12) {
			hour = hour + 12 >> 0;
		} else if (amSet && (hour === 12)) {
			hour = 0;
		}
		if (!(z === ($ptrType(Location)).nil)) {
			return [(_struct = Date(year, (month >> 0), day, hour, min, sec, nsec, z), new Time.Ptr(_struct.sec, _struct.nsec, _struct.loc)), null];
		}
		if (!((zoneOffset === -1))) {
			t = (_struct$1 = Date(year, (month >> 0), day, hour, min, sec, nsec, $pkg.UTC), new Time.Ptr(_struct$1.sec, _struct$1.nsec, _struct$1.loc));
			t.sec = (x$1 = t.sec, x$2 = new $Int64(0, zoneOffset), new $Int64(x$1.high - x$2.high, x$1.low - x$2.low));
			_tuple$22 = local.lookup((x$3 = t.sec, new $Int64(x$3.high + -15, x$3.low + 2288912640))); name = _tuple$22[0]; offset = _tuple$22[1];
			if ((offset === zoneOffset) && (zoneName === "" || name === zoneName)) {
				t.loc = local;
				return [(_struct$2 = t, new Time.Ptr(_struct$2.sec, _struct$2.nsec, _struct$2.loc)), null];
			}
			t.loc = FixedZone(zoneName, zoneOffset);
			return [(_struct$3 = t, new Time.Ptr(_struct$3.sec, _struct$3.nsec, _struct$3.loc)), null];
		}
		if (!(zoneName === "")) {
			t$1 = (_struct$4 = Date(year, (month >> 0), day, hour, min, sec, nsec, $pkg.UTC), new Time.Ptr(_struct$4.sec, _struct$4.nsec, _struct$4.loc));
			_tuple$23 = local.lookupName(zoneName, (x$4 = t$1.sec, new $Int64(x$4.high + -15, x$4.low + 2288912640))); offset$1 = _tuple$23[0]; ok$1 = _tuple$23[2];
			if (ok$1) {
				t$1.sec = (x$5 = t$1.sec, x$6 = new $Int64(0, offset$1), new $Int64(x$5.high - x$6.high, x$5.low - x$6.low));
				t$1.loc = local;
				return [(_struct$5 = t$1, new Time.Ptr(_struct$5.sec, _struct$5.nsec, _struct$5.loc)), null];
			}
			if (zoneName.length > 3 && zoneName.substring(0, 3) === "GMT") {
				_tuple$24 = atoi(zoneName.substring(3)); offset$1 = _tuple$24[0];
				offset$1 = (((offset$1 >>> 16 << 16) * 3600 >> 0) + (offset$1 << 16 >>> 16) * 3600) >> 0;
			}
			t$1.loc = FixedZone(zoneName, offset$1);
			return [(_struct$6 = t$1, new Time.Ptr(_struct$6.sec, _struct$6.nsec, _struct$6.loc)), null];
		}
		return [(_struct$7 = Date(year, (month >> 0), day, hour, min, sec, nsec, defaultLocation), new Time.Ptr(_struct$7.sec, _struct$7.nsec, _struct$7.loc)), null];
	};
	parseTimeZone = function(value) {
		var length, ok, _tmp, _tmp$1, _tmp$2, _tmp$3, _tmp$4, _tmp$5, nUpper, c, _ref, _tmp$6, _tmp$7, _tmp$8, _tmp$9, _tmp$10, _tmp$11, _tmp$12, _tmp$13, _tmp$14, _tmp$15;
		length = 0;
		ok = false;
		if (value.length < 3) {
			_tmp = 0; _tmp$1 = false; length = _tmp; ok = _tmp$1;
			return [length, ok];
		}
		if (value.length >= 4 && value.substring(0, 4) === "ChST") {
			_tmp$2 = 4; _tmp$3 = true; length = _tmp$2; ok = _tmp$3;
			return [length, ok];
		}
		if (value.substring(0, 3) === "GMT") {
			length = parseGMT(value);
			_tmp$4 = length; _tmp$5 = true; length = _tmp$4; ok = _tmp$5;
			return [length, ok];
		}
		nUpper = 0;
		nUpper = 0;
		while (nUpper < 6) {
			if (nUpper >= value.length) {
				break;
			}
			c = value.charCodeAt(nUpper);
			if (c < 65 || 90 < c) {
				break;
			}
			nUpper = nUpper + 1 >> 0;
		}
		_ref = nUpper;
		if (_ref === 0 || _ref === 1 || _ref === 2 || _ref === 6) {
			_tmp$6 = 0; _tmp$7 = false; length = _tmp$6; ok = _tmp$7;
			return [length, ok];
		} else if (_ref === 5) {
			if (value.charCodeAt(4) === 84) {
				_tmp$8 = 5; _tmp$9 = true; length = _tmp$8; ok = _tmp$9;
				return [length, ok];
			}
		} else if (_ref === 4) {
			if (value.charCodeAt(3) === 84) {
				_tmp$10 = 4; _tmp$11 = true; length = _tmp$10; ok = _tmp$11;
				return [length, ok];
			}
		} else if (_ref === 3) {
			_tmp$12 = 3; _tmp$13 = true; length = _tmp$12; ok = _tmp$13;
			return [length, ok];
		}
		_tmp$14 = 0; _tmp$15 = false; length = _tmp$14; ok = _tmp$15;
		return [length, ok];
	};
	parseGMT = function(value) {
		var sign, _tuple, x, rem, err;
		value = value.substring(3);
		if (value.length === 0) {
			return 3;
		}
		sign = value.charCodeAt(0);
		if (!((sign === 45)) && !((sign === 43))) {
			return 3;
		}
		_tuple = leadingInt(value.substring(1)); x = _tuple[0]; rem = _tuple[1]; err = _tuple[2];
		if (!($interfaceIsEqual(err, null))) {
			return 3;
		}
		if (sign === 45) {
			x = new $Int64(-x.high, -x.low);
		}
		if ((x.high === 0 && x.low === 0) || (x.high < -1 || (x.high === -1 && x.low < 4294967282)) || (0 < x.high || (0 === x.high && 12 < x.low))) {
			return 3;
		}
		return (3 + value.length >> 0) - rem.length >> 0;
	};
	parseNanoseconds = function(value, nbytes) {
		var ns, rangeErrString, err, _tuple, scaleDigits, i;
		ns = 0;
		rangeErrString = "";
		err = null;
		if (!((value.charCodeAt(0) === 46))) {
			err = errBad;
			return [ns, rangeErrString, err];
		}
		_tuple = atoi(value.substring(1, nbytes)); ns = _tuple[0]; err = _tuple[1];
		if (!($interfaceIsEqual(err, null))) {
			return [ns, rangeErrString, err];
		}
		if (ns < 0 || 1000000000 <= ns) {
			rangeErrString = "fractional second";
			return [ns, rangeErrString, err];
		}
		scaleDigits = 10 - nbytes >> 0;
		i = 0;
		while (i < scaleDigits) {
			ns = (((ns >>> 16 << 16) * 10 >> 0) + (ns << 16 >>> 16) * 10) >> 0;
			i = i + 1 >> 0;
		}
		return [ns, rangeErrString, err];
	};
	leadingInt = function(s) {
		var x, rem, err, i, c, _tmp, _tmp$1, _tmp$2, x$1, x$2, x$3, _tmp$3, _tmp$4, _tmp$5;
		x = new $Int64(0, 0);
		rem = "";
		err = null;
		i = 0;
		while (i < s.length) {
			c = s.charCodeAt(i);
			if (c < 48 || c > 57) {
				break;
			}
			if ((x.high > 214748364 || (x.high === 214748364 && x.low >= 3435973835))) {
				_tmp = new $Int64(0, 0); _tmp$1 = ""; _tmp$2 = errLeadingInt; x = _tmp; rem = _tmp$1; err = _tmp$2;
				return [x, rem, err];
			}
			x = (x$1 = (x$2 = $mul64(x, new $Int64(0, 10)), x$3 = new $Int64(0, c), new $Int64(x$2.high + x$3.high, x$2.low + x$3.low)), new $Int64(x$1.high - 0, x$1.low - 48));
			i = i + 1 >> 0;
		}
		_tmp$3 = x; _tmp$4 = s.substring(i); _tmp$5 = null; x = _tmp$3; rem = _tmp$4; err = _tmp$5;
		return [x, rem, err];
	};
	readFile = function(name) {
		var _tuple, f, err, buf, ret, n, _tuple$1;
		var $deferred = [];
		try {
			_tuple = syscall.Open(name, 0, 0); f = _tuple[0]; err = _tuple[1];
			if (!($interfaceIsEqual(err, null))) {
				return [($sliceType($Uint8)).nil, err];
			}
			$deferred.push({ recv: syscall, method: "Close", args: [f] });
			buf = $makeNativeArray("Uint8", 4096, function() { return 0; });
			ret = ($sliceType($Uint8)).nil;
			n = 0;
			while (true) {
				_tuple$1 = syscall.Read(f, new ($sliceType($Uint8))(buf)); n = _tuple$1[0]; err = _tuple$1[1];
				if (n > 0) {
					ret = $appendSlice(ret, $subslice(new ($sliceType($Uint8))(buf), 0, n));
				}
				if ((n === 0) || !($interfaceIsEqual(err, null))) {
					break;
				}
			}
			return [ret, err];
		} catch($err) {
			$pushErr($err);
			return [($sliceType($Uint8)).nil, null];
		} finally {
			$callDeferred($deferred);
		}
	};
	open = function(name) {
		var _tuple, fd, err;
		_tuple = syscall.Open(name, 0, 0); fd = _tuple[0]; err = _tuple[1];
		if (!($interfaceIsEqual(err, null))) {
			return [0, err];
		}
		return [(fd >>> 0), null];
	};
	closefd = function(fd) {
		syscall.Close((fd >> 0));
	};
	preadn = function(fd, buf, off) {
		var whence, _tuple, err, _tuple$1, m, err$1;
		whence = 0;
		if (off < 0) {
			whence = 2;
		}
		_tuple = syscall.Seek((fd >> 0), new $Int64(0, off), whence); err = _tuple[1];
		if (!($interfaceIsEqual(err, null))) {
			return err;
		}
		while (buf.length > 0) {
			_tuple$1 = syscall.Read((fd >> 0), buf); m = _tuple$1[0]; err$1 = _tuple$1[1];
			if (m <= 0) {
				if ($interfaceIsEqual(err$1, null)) {
					return errors.New("short read");
				}
				return err$1;
			}
			buf = $subslice(buf, m);
		}
		return null;
	};
	Time.Ptr.prototype.After = function(u) {
		var _struct, t, x, x$1, x$2, x$3;
		t = (_struct = this, new Time.Ptr(_struct.sec, _struct.nsec, _struct.loc));
		return (x = t.sec, x$1 = u.sec, (x.high > x$1.high || (x.high === x$1.high && x.low > x$1.low))) || (x$2 = t.sec, x$3 = u.sec, (x$2.high === x$3.high && x$2.low === x$3.low)) && t.nsec > u.nsec;
	};
	Time.prototype.After = function(u) { return this.$val.After(u); };
	Time.Ptr.prototype.Before = function(u) {
		var _struct, t, x, x$1, x$2, x$3;
		t = (_struct = this, new Time.Ptr(_struct.sec, _struct.nsec, _struct.loc));
		return (x = t.sec, x$1 = u.sec, (x.high < x$1.high || (x.high === x$1.high && x.low < x$1.low))) || (x$2 = t.sec, x$3 = u.sec, (x$2.high === x$3.high && x$2.low === x$3.low)) && t.nsec < u.nsec;
	};
	Time.prototype.Before = function(u) { return this.$val.Before(u); };
	Time.Ptr.prototype.Equal = function(u) {
		var _struct, t, x, x$1;
		t = (_struct = this, new Time.Ptr(_struct.sec, _struct.nsec, _struct.loc));
		return (x = t.sec, x$1 = u.sec, (x.high === x$1.high && x.low === x$1.low)) && (t.nsec === u.nsec);
	};
	Time.prototype.Equal = function(u) { return this.$val.Equal(u); };
	Month.prototype.String = function() {
		var m;
		m = this.$val;
		return months[(m - 1 >> 0)];
	};
	$ptrType(Month).prototype.String = function() { return new Month(this.$get()).String(); };
	Weekday.prototype.String = function() {
		var d;
		d = this.$val;
		return days[d];
	};
	$ptrType(Weekday).prototype.String = function() { return new Weekday(this.$get()).String(); };
	Time.Ptr.prototype.IsZero = function() {
		var _struct, t, x;
		t = (_struct = this, new Time.Ptr(_struct.sec, _struct.nsec, _struct.loc));
		return (x = t.sec, (x.high === 0 && x.low === 0)) && (t.nsec === 0);
	};
	Time.prototype.IsZero = function() { return this.$val.IsZero(); };
	Time.Ptr.prototype.abs = function() {
		var _struct, t, l, x, sec, x$1, x$2, x$3, _tuple, offset, x$4, x$5;
		t = (_struct = this, new Time.Ptr(_struct.sec, _struct.nsec, _struct.loc));
		l = t.loc;
		if (l === ($ptrType(Location)).nil || l === localLoc) {
			l = l.get();
		}
		sec = (x = t.sec, new $Int64(x.high + -15, x.low + 2288912640));
		if (!(l === utcLoc)) {
			if (!(l.cacheZone === ($ptrType(zone)).nil) && (x$1 = l.cacheStart, (x$1.high < sec.high || (x$1.high === sec.high && x$1.low <= sec.low))) && (x$2 = l.cacheEnd, (sec.high < x$2.high || (sec.high === x$2.high && sec.low < x$2.low)))) {
				sec = (x$3 = new $Int64(0, l.cacheZone.offset), new $Int64(sec.high + x$3.high, sec.low + x$3.low));
			} else {
				_tuple = l.lookup(sec); offset = _tuple[1];
				sec = (x$4 = new $Int64(0, offset), new $Int64(sec.high + x$4.high, sec.low + x$4.low));
			}
		}
		return (x$5 = new $Int64(sec.high + 2147483646, sec.low + 450480384), new $Uint64(x$5.high, x$5.low));
	};
	Time.prototype.abs = function() { return this.$val.abs(); };
	Time.Ptr.prototype.locabs = function() {
		var name, offset, abs, _struct, t, l, x, sec, x$1, x$2, _tuple, x$3, x$4;
		name = "";
		offset = 0;
		abs = new $Uint64(0, 0);
		t = (_struct = this, new Time.Ptr(_struct.sec, _struct.nsec, _struct.loc));
		l = t.loc;
		if (l === ($ptrType(Location)).nil || l === localLoc) {
			l = l.get();
		}
		sec = (x = t.sec, new $Int64(x.high + -15, x.low + 2288912640));
		if (!(l === utcLoc)) {
			if (!(l.cacheZone === ($ptrType(zone)).nil) && (x$1 = l.cacheStart, (x$1.high < sec.high || (x$1.high === sec.high && x$1.low <= sec.low))) && (x$2 = l.cacheEnd, (sec.high < x$2.high || (sec.high === x$2.high && sec.low < x$2.low)))) {
				name = l.cacheZone.name;
				offset = l.cacheZone.offset;
			} else {
				_tuple = l.lookup(sec); name = _tuple[0]; offset = _tuple[1];
			}
			sec = (x$3 = new $Int64(0, offset), new $Int64(sec.high + x$3.high, sec.low + x$3.low));
		} else {
			name = "UTC";
		}
		abs = (x$4 = new $Int64(sec.high + 2147483646, sec.low + 450480384), new $Uint64(x$4.high, x$4.low));
		return [name, offset, abs];
	};
	Time.prototype.locabs = function() { return this.$val.locabs(); };
	Time.Ptr.prototype.Date = function() {
		var year, month, day, _struct, t, _tuple;
		year = 0;
		month = 0;
		day = 0;
		t = (_struct = this, new Time.Ptr(_struct.sec, _struct.nsec, _struct.loc));
		_tuple = t.date(true); year = _tuple[0]; month = _tuple[1]; day = _tuple[2];
		return [year, month, day];
	};
	Time.prototype.Date = function() { return this.$val.Date(); };
	Time.Ptr.prototype.Year = function() {
		var _struct, t, _tuple, year;
		t = (_struct = this, new Time.Ptr(_struct.sec, _struct.nsec, _struct.loc));
		_tuple = t.date(false); year = _tuple[0];
		return year;
	};
	Time.prototype.Year = function() { return this.$val.Year(); };
	Time.Ptr.prototype.Month = function() {
		var _struct, t, _tuple, month;
		t = (_struct = this, new Time.Ptr(_struct.sec, _struct.nsec, _struct.loc));
		_tuple = t.date(true); month = _tuple[1];
		return month;
	};
	Time.prototype.Month = function() { return this.$val.Month(); };
	Time.Ptr.prototype.Day = function() {
		var _struct, t, _tuple, day;
		t = (_struct = this, new Time.Ptr(_struct.sec, _struct.nsec, _struct.loc));
		_tuple = t.date(true); day = _tuple[2];
		return day;
	};
	Time.prototype.Day = function() { return this.$val.Day(); };
	Time.Ptr.prototype.Weekday = function() {
		var _struct, t;
		t = (_struct = this, new Time.Ptr(_struct.sec, _struct.nsec, _struct.loc));
		return absWeekday(t.abs());
	};
	Time.prototype.Weekday = function() { return this.$val.Weekday(); };
	absWeekday = function(abs) {
		var sec, _q;
		sec = $div64((new $Uint64(abs.high + 0, abs.low + 86400)), new $Uint64(0, 604800), true);
		return ((_q = (sec.low >> 0) / 86400, (_q === _q && _q !== 1/0 && _q !== -1/0) ? _q >> 0 : $throwRuntimeError("integer divide by zero")) >> 0);
	};
	Time.Ptr.prototype.ISOWeek = function() {
		var year, week, _struct, t, _tuple, month, day, yday, _r, wday, _q, _r$1, jan1wday, _r$2, dec31wday;
		year = 0;
		week = 0;
		t = (_struct = this, new Time.Ptr(_struct.sec, _struct.nsec, _struct.loc));
		_tuple = t.date(true); year = _tuple[0]; month = _tuple[1]; day = _tuple[2]; yday = _tuple[3];
		wday = (_r = ((t.Weekday() + 6 >> 0) >> 0) % 7, _r === _r ? _r : $throwRuntimeError("integer divide by zero"));
		week = (_q = (((yday - wday >> 0) + 7 >> 0)) / 7, (_q === _q && _q !== 1/0 && _q !== -1/0) ? _q >> 0 : $throwRuntimeError("integer divide by zero"));
		jan1wday = (_r$1 = (((wday - yday >> 0) + 371 >> 0)) % 7, _r$1 === _r$1 ? _r$1 : $throwRuntimeError("integer divide by zero"));
		if (1 <= jan1wday && jan1wday <= 3) {
			week = week + 1 >> 0;
		}
		if (week === 0) {
			year = year - 1 >> 0;
			week = 52;
			if ((jan1wday === 4) || ((jan1wday === 5) && isLeap(year))) {
				week = week + 1 >> 0;
			}
		}
		if ((month === 12) && day >= 29 && wday < 3) {
			dec31wday = (_r$2 = (((wday + 31 >> 0) - day >> 0)) % 7, _r$2 === _r$2 ? _r$2 : $throwRuntimeError("integer divide by zero"));
			if (0 <= dec31wday && dec31wday <= 2) {
				year = year + 1 >> 0;
				week = 1;
			}
		}
		return [year, week];
	};
	Time.prototype.ISOWeek = function() { return this.$val.ISOWeek(); };
	Time.Ptr.prototype.Clock = function() {
		var hour, min, sec, _struct, t, _tuple;
		hour = 0;
		min = 0;
		sec = 0;
		t = (_struct = this, new Time.Ptr(_struct.sec, _struct.nsec, _struct.loc));
		_tuple = absClock(t.abs()); hour = _tuple[0]; min = _tuple[1]; sec = _tuple[2];
		return [hour, min, sec];
	};
	Time.prototype.Clock = function() { return this.$val.Clock(); };
	absClock = function(abs) {
		var hour, min, sec, _q, _q$1;
		hour = 0;
		min = 0;
		sec = 0;
		sec = ($div64(abs, new $Uint64(0, 86400), true).low >> 0);
		hour = (_q = sec / 3600, (_q === _q && _q !== 1/0 && _q !== -1/0) ? _q >> 0 : $throwRuntimeError("integer divide by zero"));
		sec = sec - (((((hour >>> 16 << 16) * 3600 >> 0) + (hour << 16 >>> 16) * 3600) >> 0)) >> 0;
		min = (_q$1 = sec / 60, (_q$1 === _q$1 && _q$1 !== 1/0 && _q$1 !== -1/0) ? _q$1 >> 0 : $throwRuntimeError("integer divide by zero"));
		sec = sec - (((((min >>> 16 << 16) * 60 >> 0) + (min << 16 >>> 16) * 60) >> 0)) >> 0;
		return [hour, min, sec];
	};
	Time.Ptr.prototype.Hour = function() {
		var _struct, t, _q;
		t = (_struct = this, new Time.Ptr(_struct.sec, _struct.nsec, _struct.loc));
		return (_q = ($div64(t.abs(), new $Uint64(0, 86400), true).low >> 0) / 3600, (_q === _q && _q !== 1/0 && _q !== -1/0) ? _q >> 0 : $throwRuntimeError("integer divide by zero"));
	};
	Time.prototype.Hour = function() { return this.$val.Hour(); };
	Time.Ptr.prototype.Minute = function() {
		var _struct, t, _q;
		t = (_struct = this, new Time.Ptr(_struct.sec, _struct.nsec, _struct.loc));
		return (_q = ($div64(t.abs(), new $Uint64(0, 3600), true).low >> 0) / 60, (_q === _q && _q !== 1/0 && _q !== -1/0) ? _q >> 0 : $throwRuntimeError("integer divide by zero"));
	};
	Time.prototype.Minute = function() { return this.$val.Minute(); };
	Time.Ptr.prototype.Second = function() {
		var _struct, t;
		t = (_struct = this, new Time.Ptr(_struct.sec, _struct.nsec, _struct.loc));
		return ($div64(t.abs(), new $Uint64(0, 60), true).low >> 0);
	};
	Time.prototype.Second = function() { return this.$val.Second(); };
	Time.Ptr.prototype.Nanosecond = function() {
		var _struct, t;
		t = (_struct = this, new Time.Ptr(_struct.sec, _struct.nsec, _struct.loc));
		return (t.nsec >> 0);
	};
	Time.prototype.Nanosecond = function() { return this.$val.Nanosecond(); };
	Time.Ptr.prototype.YearDay = function() {
		var _struct, t, _tuple, yday;
		t = (_struct = this, new Time.Ptr(_struct.sec, _struct.nsec, _struct.loc));
		_tuple = t.date(false); yday = _tuple[3];
		return yday + 1 >> 0;
	};
	Time.prototype.YearDay = function() { return this.$val.YearDay(); };
	Duration.prototype.String = function() {
		var d, buf, w, u, neg, prec, unit, _tuple, _tuple$1;
		d = this;
		buf = $makeNativeArray("Uint8", 32, function() { return 0; });
		w = 32;
		u = new $Uint64(d.high, d.low);
		neg = (d.high < 0 || (d.high === 0 && d.low < 0));
		if (neg) {
			u = new $Uint64(-u.high, -u.low);
		}
		if ((u.high < 0 || (u.high === 0 && u.low < 1000000000))) {
			prec = 0;
			unit = 0;
			if ((u.high === 0 && u.low === 0)) {
				return "0";
			} else if ((u.high < 0 || (u.high === 0 && u.low < 1000))) {
				prec = 0;
				unit = 110;
			} else if ((u.high < 0 || (u.high === 0 && u.low < 1000000))) {
				prec = 3;
				unit = 117;
			} else {
				prec = 6;
				unit = 109;
			}
			w = w - 2 >> 0;
			buf[w] = unit;
			buf[(w + 1 >> 0)] = 115;
			_tuple = fmtFrac($subslice(new ($sliceType($Uint8))(buf), 0, w), u, prec); w = _tuple[0]; u = _tuple[1];
			w = fmtInt($subslice(new ($sliceType($Uint8))(buf), 0, w), u);
		} else {
			w = w - 1 >> 0;
			buf[w] = 115;
			_tuple$1 = fmtFrac($subslice(new ($sliceType($Uint8))(buf), 0, w), u, 9); w = _tuple$1[0]; u = _tuple$1[1];
			w = fmtInt($subslice(new ($sliceType($Uint8))(buf), 0, w), $div64(u, new $Uint64(0, 60), true));
			u = $div64(u, new $Uint64(0, 60), false);
			if ((u.high > 0 || (u.high === 0 && u.low > 0))) {
				w = w - 1 >> 0;
				buf[w] = 109;
				w = fmtInt($subslice(new ($sliceType($Uint8))(buf), 0, w), $div64(u, new $Uint64(0, 60), true));
				u = $div64(u, new $Uint64(0, 60), false);
				if ((u.high > 0 || (u.high === 0 && u.low > 0))) {
					w = w - 1 >> 0;
					buf[w] = 104;
					w = fmtInt($subslice(new ($sliceType($Uint8))(buf), 0, w), u);
				}
			}
		}
		if (neg) {
			w = w - 1 >> 0;
			buf[w] = 45;
		}
		return $bytesToString($subslice(new ($sliceType($Uint8))(buf), w));
	};
	$ptrType(Duration).prototype.String = function() { return this.$get().String(); };
	fmtFrac = function(buf, v, prec) {
		var nw, nv, w, print, i, digit, _tmp, _tmp$1;
		nw = 0;
		nv = new $Uint64(0, 0);
		w = buf.length;
		print = false;
		i = 0;
		while (i < prec) {
			digit = $div64(v, new $Uint64(0, 10), true);
			print = print || !((digit.high === 0 && digit.low === 0));
			if (print) {
				w = w - 1 >> 0;
				(w < 0 || w >= buf.length) ? $throwRuntimeError("index out of range") : buf.array[buf.offset + w] = (digit.low << 24 >>> 24) + 48 << 24 >>> 24;
			}
			v = $div64(v, new $Uint64(0, 10), false);
			i = i + 1 >> 0;
		}
		if (print) {
			w = w - 1 >> 0;
			(w < 0 || w >= buf.length) ? $throwRuntimeError("index out of range") : buf.array[buf.offset + w] = 46;
		}
		_tmp = w; _tmp$1 = v; nw = _tmp; nv = _tmp$1;
		return [nw, nv];
	};
	fmtInt = function(buf, v) {
		var w;
		w = buf.length;
		if ((v.high === 0 && v.low === 0)) {
			w = w - 1 >> 0;
			(w < 0 || w >= buf.length) ? $throwRuntimeError("index out of range") : buf.array[buf.offset + w] = 48;
		} else {
			while ((v.high > 0 || (v.high === 0 && v.low > 0))) {
				w = w - 1 >> 0;
				(w < 0 || w >= buf.length) ? $throwRuntimeError("index out of range") : buf.array[buf.offset + w] = ($div64(v, new $Uint64(0, 10), true).low << 24 >>> 24) + 48 << 24 >>> 24;
				v = $div64(v, new $Uint64(0, 10), false);
			}
		}
		return w;
	};
	Duration.prototype.Nanoseconds = function() {
		var d;
		d = this;
		return new $Int64(d.high, d.low);
	};
	$ptrType(Duration).prototype.Nanoseconds = function() { return this.$get().Nanoseconds(); };
	Duration.prototype.Seconds = function() {
		var d, sec, nsec;
		d = this;
		sec = $div64(d, new Duration(0, 1000000000), false);
		nsec = $div64(d, new Duration(0, 1000000000), true);
		return $flatten64(sec) + $flatten64(nsec) * 1e-09;
	};
	$ptrType(Duration).prototype.Seconds = function() { return this.$get().Seconds(); };
	Duration.prototype.Minutes = function() {
		var d, min, nsec;
		d = this;
		min = $div64(d, new Duration(13, 4165425152), false);
		nsec = $div64(d, new Duration(13, 4165425152), true);
		return $flatten64(min) + $flatten64(nsec) * 1.6666666666666667e-11;
	};
	$ptrType(Duration).prototype.Minutes = function() { return this.$get().Minutes(); };
	Duration.prototype.Hours = function() {
		var d, hour, nsec;
		d = this;
		hour = $div64(d, new Duration(838, 817405952), false);
		nsec = $div64(d, new Duration(838, 817405952), true);
		return $flatten64(hour) + $flatten64(nsec) * 2.777777777777778e-13;
	};
	$ptrType(Duration).prototype.Hours = function() { return this.$get().Hours(); };
	Time.Ptr.prototype.Add = function(d) {
		var _struct, t, x, x$1, x$2, x$3, nsec, x$4, x$5, _struct$1;
		t = (_struct = this, new Time.Ptr(_struct.sec, _struct.nsec, _struct.loc));
		t.sec = (x = t.sec, x$1 = (x$2 = $div64(d, new Duration(0, 1000000000), false), new $Int64(x$2.high, x$2.low)), new $Int64(x.high + x$1.high, x.low + x$1.low));
		nsec = (t.nsec >> 0) + ((x$3 = $div64(d, new Duration(0, 1000000000), true), x$3.low + ((x$3.high >> 31) * 4294967296)) >> 0) >> 0;
		if (nsec >= 1000000000) {
			t.sec = (x$4 = t.sec, new $Int64(x$4.high + 0, x$4.low + 1));
			nsec = nsec - 1000000000 >> 0;
		} else if (nsec < 0) {
			t.sec = (x$5 = t.sec, new $Int64(x$5.high - 0, x$5.low - 1));
			nsec = nsec + 1000000000 >> 0;
		}
		t.nsec = (nsec >>> 0);
		return (_struct$1 = t, new Time.Ptr(_struct$1.sec, _struct$1.nsec, _struct$1.loc));
	};
	Time.prototype.Add = function(d) { return this.$val.Add(d); };
	Time.Ptr.prototype.Sub = function(u) {
		var _struct, t, x, x$1, x$2, x$3, x$4, d, _struct$1, _struct$2;
		t = (_struct = this, new Time.Ptr(_struct.sec, _struct.nsec, _struct.loc));
		d = (x = $mul64((x$1 = (x$2 = t.sec, x$3 = u.sec, new $Int64(x$2.high - x$3.high, x$2.low - x$3.low)), new Duration(x$1.high, x$1.low)), new Duration(0, 1000000000)), x$4 = new Duration(0, ((t.nsec >> 0) - (u.nsec >> 0) >> 0)), new Duration(x.high + x$4.high, x.low + x$4.low));
		if (u.Add(d).Equal((_struct$1 = t, new Time.Ptr(_struct$1.sec, _struct$1.nsec, _struct$1.loc)))) {
			return d;
		} else if (t.Before((_struct$2 = u, new Time.Ptr(_struct$2.sec, _struct$2.nsec, _struct$2.loc)))) {
			return new Duration(-2147483648, 0);
		} else {
			return new Duration(2147483647, 4294967295);
		}
	};
	Time.prototype.Sub = function(u) { return this.$val.Sub(u); };
	Time.Ptr.prototype.AddDate = function(years, months$1, days$1) {
		var _struct, t, _tuple, year, month, day, _tuple$1, hour, min, sec, _struct$1;
		t = (_struct = this, new Time.Ptr(_struct.sec, _struct.nsec, _struct.loc));
		_tuple = t.Date(); year = _tuple[0]; month = _tuple[1]; day = _tuple[2];
		_tuple$1 = t.Clock(); hour = _tuple$1[0]; min = _tuple$1[1]; sec = _tuple$1[2];
		return (_struct$1 = Date(year + years >> 0, month + (months$1 >> 0) >> 0, day + days$1 >> 0, hour, min, sec, (t.nsec >> 0), t.loc), new Time.Ptr(_struct$1.sec, _struct$1.nsec, _struct$1.loc));
	};
	Time.prototype.AddDate = function(years, months$1, days$1) { return this.$val.AddDate(years, months$1, days$1); };
	Time.Ptr.prototype.date = function(full) {
		var year, month, day, yday, _struct, t, _tuple;
		year = 0;
		month = 0;
		day = 0;
		yday = 0;
		t = (_struct = this, new Time.Ptr(_struct.sec, _struct.nsec, _struct.loc));
		_tuple = absDate(t.abs(), full); year = _tuple[0]; month = _tuple[1]; day = _tuple[2]; yday = _tuple[3];
		return [year, month, day, yday];
	};
	Time.prototype.date = function(full) { return this.$val.date(full); };
	absDate = function(abs, full) {
		var year, month, day, yday, d, n, y, x, x$1, x$2, x$3, x$4, x$5, x$6, x$7, x$8, x$9, x$10, _q, end, begin;
		year = 0;
		month = 0;
		day = 0;
		yday = 0;
		d = $div64(abs, new $Uint64(0, 86400), false);
		n = $div64(d, new $Uint64(0, 146097), false);
		y = $mul64(new $Uint64(0, 400), n);
		d = (x = $mul64(new $Uint64(0, 146097), n), new $Uint64(d.high - x.high, d.low - x.low));
		n = $div64(d, new $Uint64(0, 36524), false);
		n = (x$1 = $shiftRightUint64(n, 2), new $Uint64(n.high - x$1.high, n.low - x$1.low));
		y = (x$2 = $mul64(new $Uint64(0, 100), n), new $Uint64(y.high + x$2.high, y.low + x$2.low));
		d = (x$3 = $mul64(new $Uint64(0, 36524), n), new $Uint64(d.high - x$3.high, d.low - x$3.low));
		n = $div64(d, new $Uint64(0, 1461), false);
		y = (x$4 = $mul64(new $Uint64(0, 4), n), new $Uint64(y.high + x$4.high, y.low + x$4.low));
		d = (x$5 = $mul64(new $Uint64(0, 1461), n), new $Uint64(d.high - x$5.high, d.low - x$5.low));
		n = $div64(d, new $Uint64(0, 365), false);
		n = (x$6 = $shiftRightUint64(n, 2), new $Uint64(n.high - x$6.high, n.low - x$6.low));
		y = (x$7 = n, new $Uint64(y.high + x$7.high, y.low + x$7.low));
		d = (x$8 = $mul64(new $Uint64(0, 365), n), new $Uint64(d.high - x$8.high, d.low - x$8.low));
		year = ((x$9 = (x$10 = new $Int64(y.high, y.low), new $Int64(x$10.high + -69, x$10.low + 4075721025)), x$9.low + ((x$9.high >> 31) * 4294967296)) >> 0);
		yday = (d.low >> 0);
		if (!full) {
			return [year, month, day, yday];
		}
		day = yday;
		if (isLeap(year)) {
			if (day > 59) {
				day = day - 1 >> 0;
			} else if (day === 59) {
				month = 2;
				day = 29;
				return [year, month, day, yday];
			}
		}
		month = ((_q = day / 31, (_q === _q && _q !== 1/0 && _q !== -1/0) ? _q >> 0 : $throwRuntimeError("integer divide by zero")) >> 0);
		end = (daysBefore[(month + 1 >> 0)] >> 0);
		begin = 0;
		if (day >= end) {
			month = month + 1 >> 0;
			begin = end;
		} else {
			begin = (daysBefore[month] >> 0);
		}
		month = month + 1 >> 0;
		day = (day - begin >> 0) + 1 >> 0;
		return [year, month, day, yday];
	};
	Time.Ptr.prototype.UTC = function() {
		var _struct, t, _struct$1;
		t = (_struct = this, new Time.Ptr(_struct.sec, _struct.nsec, _struct.loc));
		t.loc = $pkg.UTC;
		return (_struct$1 = t, new Time.Ptr(_struct$1.sec, _struct$1.nsec, _struct$1.loc));
	};
	Time.prototype.UTC = function() { return this.$val.UTC(); };
	Time.Ptr.prototype.Local = function() {
		var _struct, t, _struct$1;
		t = (_struct = this, new Time.Ptr(_struct.sec, _struct.nsec, _struct.loc));
		t.loc = $pkg.Local;
		return (_struct$1 = t, new Time.Ptr(_struct$1.sec, _struct$1.nsec, _struct$1.loc));
	};
	Time.prototype.Local = function() { return this.$val.Local(); };
	Time.Ptr.prototype.In = function(loc) {
		var _struct, t, _struct$1;
		t = (_struct = this, new Time.Ptr(_struct.sec, _struct.nsec, _struct.loc));
		if (loc === ($ptrType(Location)).nil) {
			throw $panic(new $String("time: missing Location in call to Time.In"));
		}
		t.loc = loc;
		return (_struct$1 = t, new Time.Ptr(_struct$1.sec, _struct$1.nsec, _struct$1.loc));
	};
	Time.prototype.In = function(loc) { return this.$val.In(loc); };
	Time.Ptr.prototype.Location = function() {
		var _struct, t, l;
		t = (_struct = this, new Time.Ptr(_struct.sec, _struct.nsec, _struct.loc));
		l = t.loc;
		if (l === ($ptrType(Location)).nil) {
			l = $pkg.UTC;
		}
		return l;
	};
	Time.prototype.Location = function() { return this.$val.Location(); };
	Time.Ptr.prototype.Zone = function() {
		var name, offset, _struct, t, _tuple, x;
		name = "";
		offset = 0;
		t = (_struct = this, new Time.Ptr(_struct.sec, _struct.nsec, _struct.loc));
		_tuple = t.loc.lookup((x = t.sec, new $Int64(x.high + -15, x.low + 2288912640))); name = _tuple[0]; offset = _tuple[1];
		return [name, offset];
	};
	Time.prototype.Zone = function() { return this.$val.Zone(); };
	Time.Ptr.prototype.Unix = function() {
		var _struct, t, x;
		t = (_struct = this, new Time.Ptr(_struct.sec, _struct.nsec, _struct.loc));
		return (x = t.sec, new $Int64(x.high + -15, x.low + 2288912640));
	};
	Time.prototype.Unix = function() { return this.$val.Unix(); };
	Time.Ptr.prototype.UnixNano = function() {
		var _struct, t, x, x$1, x$2, x$3;
		t = (_struct = this, new Time.Ptr(_struct.sec, _struct.nsec, _struct.loc));
		return (x = $mul64(((x$1 = t.sec, new $Int64(x$1.high + -15, x$1.low + 2288912640))), new $Int64(0, 1000000000)), x$2 = (x$3 = t.nsec, new $Int64(0, x$3.constructor === Number ? x$3 : 1)), new $Int64(x.high + x$2.high, x.low + x$2.low));
	};
	Time.prototype.UnixNano = function() { return this.$val.UnixNano(); };
	Time.Ptr.prototype.MarshalBinary = function() {
		var _struct, t, offsetMin, _tuple, offset, _r, _q, enc;
		t = (_struct = this, new Time.Ptr(_struct.sec, _struct.nsec, _struct.loc));
		offsetMin = 0;
		if (t.Location() === utcLoc) {
			offsetMin = -1;
		} else {
			_tuple = t.Zone(); offset = _tuple[1];
			if (!(((_r = offset % 60, _r === _r ? _r : $throwRuntimeError("integer divide by zero")) === 0))) {
				return [($sliceType($Uint8)).nil, errors.New("Time.MarshalBinary: zone offset has fractional minute")];
			}
			offset = (_q = offset / 60, (_q === _q && _q !== 1/0 && _q !== -1/0) ? _q >> 0 : $throwRuntimeError("integer divide by zero"));
			if (offset < -32768 || (offset === -1) || offset > 32767) {
				return [($sliceType($Uint8)).nil, errors.New("Time.MarshalBinary: unexpected zone offset")];
			}
			offsetMin = (offset << 16 >> 16);
		}
		enc = new ($sliceType($Uint8))([1, ($shiftRightInt64(t.sec, 56).low << 24 >>> 24), ($shiftRightInt64(t.sec, 48).low << 24 >>> 24), ($shiftRightInt64(t.sec, 40).low << 24 >>> 24), ($shiftRightInt64(t.sec, 32).low << 24 >>> 24), ($shiftRightInt64(t.sec, 24).low << 24 >>> 24), ($shiftRightInt64(t.sec, 16).low << 24 >>> 24), ($shiftRightInt64(t.sec, 8).low << 24 >>> 24), (t.sec.low << 24 >>> 24), ((t.nsec >>> 24 >>> 0) << 24 >>> 24), ((t.nsec >>> 16 >>> 0) << 24 >>> 24), ((t.nsec >>> 8 >>> 0) << 24 >>> 24), (t.nsec << 24 >>> 24), ((offsetMin >> 8 << 16 >> 16) << 24 >>> 24), (offsetMin << 24 >>> 24)]);
		return [enc, null];
	};
	Time.prototype.MarshalBinary = function() { return this.$val.MarshalBinary(); };
	Time.Ptr.prototype.UnmarshalBinary = function(data$1) {
		var t, buf, x, x$1, x$2, x$3, x$4, x$5, x$6, x$7, x$8, x$9, x$10, x$11, x$12, x$13, x$14, offset, _tuple, x$15, localoff;
		t = this;
		buf = data$1;
		if (buf.length === 0) {
			return errors.New("Time.UnmarshalBinary: no data");
		}
		if (!((((0 < 0 || 0 >= buf.length) ? $throwRuntimeError("index out of range") : buf.array[buf.offset + 0]) === 1))) {
			return errors.New("Time.UnmarshalBinary: unsupported version");
		}
		if (!((buf.length === 15))) {
			return errors.New("Time.UnmarshalBinary: invalid length");
		}
		buf = $subslice(buf, 1);
		t.sec = (x = (x$1 = (x$2 = (x$3 = (x$4 = (x$5 = (x$6 = new $Int64(0, ((7 < 0 || 7 >= buf.length) ? $throwRuntimeError("index out of range") : buf.array[buf.offset + 7])), x$7 = $shiftLeft64(new $Int64(0, ((6 < 0 || 6 >= buf.length) ? $throwRuntimeError("index out of range") : buf.array[buf.offset + 6])), 8), new $Int64(x$6.high | x$7.high, (x$6.low | x$7.low) >>> 0)), x$8 = $shiftLeft64(new $Int64(0, ((5 < 0 || 5 >= buf.length) ? $throwRuntimeError("index out of range") : buf.array[buf.offset + 5])), 16), new $Int64(x$5.high | x$8.high, (x$5.low | x$8.low) >>> 0)), x$9 = $shiftLeft64(new $Int64(0, ((4 < 0 || 4 >= buf.length) ? $throwRuntimeError("index out of range") : buf.array[buf.offset + 4])), 24), new $Int64(x$4.high | x$9.high, (x$4.low | x$9.low) >>> 0)), x$10 = $shiftLeft64(new $Int64(0, ((3 < 0 || 3 >= buf.length) ? $throwRuntimeError("index out of range") : buf.array[buf.offset + 3])), 32), new $Int64(x$3.high | x$10.high, (x$3.low | x$10.low) >>> 0)), x$11 = $shiftLeft64(new $Int64(0, ((2 < 0 || 2 >= buf.length) ? $throwRuntimeError("index out of range") : buf.array[buf.offset + 2])), 40), new $Int64(x$2.high | x$11.high, (x$2.low | x$11.low) >>> 0)), x$12 = $shiftLeft64(new $Int64(0, ((1 < 0 || 1 >= buf.length) ? $throwRuntimeError("index out of range") : buf.array[buf.offset + 1])), 48), new $Int64(x$1.high | x$12.high, (x$1.low | x$12.low) >>> 0)), x$13 = $shiftLeft64(new $Int64(0, ((0 < 0 || 0 >= buf.length) ? $throwRuntimeError("index out of range") : buf.array[buf.offset + 0])), 56), new $Int64(x.high | x$13.high, (x.low | x$13.low) >>> 0));
		buf = $subslice(buf, 8);
		t.nsec = (((((((3 < 0 || 3 >= buf.length) ? $throwRuntimeError("index out of range") : buf.array[buf.offset + 3]) >> 0) | ((((2 < 0 || 2 >= buf.length) ? $throwRuntimeError("index out of range") : buf.array[buf.offset + 2]) >> 0) << 8 >> 0)) | ((((1 < 0 || 1 >= buf.length) ? $throwRuntimeError("index out of range") : buf.array[buf.offset + 1]) >> 0) << 16 >> 0)) | ((((0 < 0 || 0 >= buf.length) ? $throwRuntimeError("index out of range") : buf.array[buf.offset + 0]) >> 0) << 24 >> 0)) >>> 0);
		buf = $subslice(buf, 4);
		offset = (x$14 = (((((1 < 0 || 1 >= buf.length) ? $throwRuntimeError("index out of range") : buf.array[buf.offset + 1]) << 16 >> 16) | ((((0 < 0 || 0 >= buf.length) ? $throwRuntimeError("index out of range") : buf.array[buf.offset + 0]) << 16 >> 16) << 8 << 16 >> 16)) >> 0), (((x$14 >>> 16 << 16) * 60 >> 0) + (x$14 << 16 >>> 16) * 60) >> 0);
		if (offset === -60) {
			t.loc = utcLoc;
		} else {
			_tuple = $pkg.Local.lookup((x$15 = t.sec, new $Int64(x$15.high + -15, x$15.low + 2288912640))); localoff = _tuple[1];
			if (offset === localoff) {
				t.loc = $pkg.Local;
			} else {
				t.loc = FixedZone("", offset);
			}
		}
		return null;
	};
	Time.prototype.UnmarshalBinary = function(data$1) { return this.$val.UnmarshalBinary(data$1); };
	Time.Ptr.prototype.GobEncode = function() {
		var _struct, t;
		t = (_struct = this, new Time.Ptr(_struct.sec, _struct.nsec, _struct.loc));
		return t.MarshalBinary();
	};
	Time.prototype.GobEncode = function() { return this.$val.GobEncode(); };
	Time.Ptr.prototype.GobDecode = function(data$1) {
		var t;
		t = this;
		return t.UnmarshalBinary(data$1);
	};
	Time.prototype.GobDecode = function(data$1) { return this.$val.GobDecode(data$1); };
	Time.Ptr.prototype.MarshalJSON = function() {
		var _struct, t, y;
		t = (_struct = this, new Time.Ptr(_struct.sec, _struct.nsec, _struct.loc));
		y = t.Year();
		if (y < 0 || y >= 10000) {
			return [($sliceType($Uint8)).nil, errors.New("Time.MarshalJSON: year outside of range [0,9999]")];
		}
		return [new ($sliceType($Uint8))($stringToBytes(t.Format("\"2006-01-02T15:04:05.999999999Z07:00\""))), null];
	};
	Time.prototype.MarshalJSON = function() { return this.$val.MarshalJSON(); };
	Time.Ptr.prototype.UnmarshalJSON = function(data$1) {
		var err, t, _tuple, _struct, l, r;
		err = null;
		t = this;
		_tuple = Parse("\"2006-01-02T15:04:05Z07:00\"", $bytesToString(data$1)); l = t; r = (_struct = _tuple[0], new Time.Ptr(_struct.sec, _struct.nsec, _struct.loc)); l.sec = r.sec; l.nsec = r.nsec; l.loc = r.loc; err = _tuple[1];
		return err;
	};
	Time.prototype.UnmarshalJSON = function(data$1) { return this.$val.UnmarshalJSON(data$1); };
	Time.Ptr.prototype.MarshalText = function() {
		var _struct, t, y;
		t = (_struct = this, new Time.Ptr(_struct.sec, _struct.nsec, _struct.loc));
		y = t.Year();
		if (y < 0 || y >= 10000) {
			return [($sliceType($Uint8)).nil, errors.New("Time.MarshalText: year outside of range [0,9999]")];
		}
		return [new ($sliceType($Uint8))($stringToBytes(t.Format("2006-01-02T15:04:05.999999999Z07:00"))), null];
	};
	Time.prototype.MarshalText = function() { return this.$val.MarshalText(); };
	Time.Ptr.prototype.UnmarshalText = function(data$1) {
		var err, t, _tuple, _struct, l, r;
		err = null;
		t = this;
		_tuple = Parse("2006-01-02T15:04:05Z07:00", $bytesToString(data$1)); l = t; r = (_struct = _tuple[0], new Time.Ptr(_struct.sec, _struct.nsec, _struct.loc)); l.sec = r.sec; l.nsec = r.nsec; l.loc = r.loc; err = _tuple[1];
		return err;
	};
	Time.prototype.UnmarshalText = function(data$1) { return this.$val.UnmarshalText(data$1); };
	Unix = $pkg.Unix = function(sec, nsec) {
		var n, x, x$1;
		if ((nsec.high < 0 || (nsec.high === 0 && nsec.low < 0)) || (nsec.high > 0 || (nsec.high === 0 && nsec.low >= 1000000000))) {
			n = $div64(nsec, new $Int64(0, 1000000000), false);
			sec = (x = n, new $Int64(sec.high + x.high, sec.low + x.low));
			nsec = (x$1 = $mul64(n, new $Int64(0, 1000000000)), new $Int64(nsec.high - x$1.high, nsec.low - x$1.low));
			if ((nsec.high < 0 || (nsec.high === 0 && nsec.low < 0))) {
				nsec = new $Int64(nsec.high + 0, nsec.low + 1000000000);
				sec = new $Int64(sec.high - 0, sec.low - 1);
			}
		}
		return new Time.Ptr(new $Int64(sec.high + 14, sec.low + 2006054656), (nsec.low >>> 0), $pkg.Local);
	};
	isLeap = function(year) {
		var _r, _r$1, _r$2;
		return ((_r = year % 4, _r === _r ? _r : $throwRuntimeError("integer divide by zero")) === 0) && (!(((_r$1 = year % 100, _r$1 === _r$1 ? _r$1 : $throwRuntimeError("integer divide by zero")) === 0)) || ((_r$2 = year % 400, _r$2 === _r$2 ? _r$2 : $throwRuntimeError("integer divide by zero")) === 0));
	};
	norm = function(hi, lo, base) {
		var nhi, nlo, _q, n, _q$1, n$1, _tmp, _tmp$1;
		nhi = 0;
		nlo = 0;
		if (lo < 0) {
			n = (_q = ((-lo - 1 >> 0)) / base, (_q === _q && _q !== 1/0 && _q !== -1/0) ? _q >> 0 : $throwRuntimeError("integer divide by zero")) + 1 >> 0;
			hi = hi - (n) >> 0;
			lo = lo + (((((n >>> 16 << 16) * base >> 0) + (n << 16 >>> 16) * base) >> 0)) >> 0;
		}
		if (lo >= base) {
			n$1 = (_q$1 = lo / base, (_q$1 === _q$1 && _q$1 !== 1/0 && _q$1 !== -1/0) ? _q$1 >> 0 : $throwRuntimeError("integer divide by zero"));
			hi = hi + (n$1) >> 0;
			lo = lo - (((((n$1 >>> 16 << 16) * base >> 0) + (n$1 << 16 >>> 16) * base) >> 0)) >> 0;
		}
		_tmp = hi; _tmp$1 = lo; nhi = _tmp; nlo = _tmp$1;
		return [nhi, nlo];
	};
	Date = $pkg.Date = function(year, month, day, hour, min, sec, nsec, loc) {
		var m, _tuple, _tuple$1, _tuple$2, _tuple$3, _tuple$4, x, x$1, y, n, x$2, d, x$3, x$4, x$5, x$6, x$7, x$8, x$9, abs, x$10, x$11, unix, _tuple$5, offset, start, end, x$12, utc, _tuple$6, _tuple$7, x$13;
		if (loc === ($ptrType(Location)).nil) {
			throw $panic(new $String("time: missing Location in call to Date"));
		}
		m = (month >> 0) - 1 >> 0;
		_tuple = norm(year, m, 12); year = _tuple[0]; m = _tuple[1];
		month = (m >> 0) + 1 >> 0;
		_tuple$1 = norm(sec, nsec, 1000000000); sec = _tuple$1[0]; nsec = _tuple$1[1];
		_tuple$2 = norm(min, sec, 60); min = _tuple$2[0]; sec = _tuple$2[1];
		_tuple$3 = norm(hour, min, 60); hour = _tuple$3[0]; min = _tuple$3[1];
		_tuple$4 = norm(day, hour, 24); day = _tuple$4[0]; hour = _tuple$4[1];
		y = (x = (x$1 = new $Int64(0, year), new $Int64(x$1.high - -69, x$1.low - 4075721025)), new $Uint64(x.high, x.low));
		n = $div64(y, new $Uint64(0, 400), false);
		y = (x$2 = $mul64(new $Uint64(0, 400), n), new $Uint64(y.high - x$2.high, y.low - x$2.low));
		d = $mul64(new $Uint64(0, 146097), n);
		n = $div64(y, new $Uint64(0, 100), false);
		y = (x$3 = $mul64(new $Uint64(0, 100), n), new $Uint64(y.high - x$3.high, y.low - x$3.low));
		d = (x$4 = $mul64(new $Uint64(0, 36524), n), new $Uint64(d.high + x$4.high, d.low + x$4.low));
		n = $div64(y, new $Uint64(0, 4), false);
		y = (x$5 = $mul64(new $Uint64(0, 4), n), new $Uint64(y.high - x$5.high, y.low - x$5.low));
		d = (x$6 = $mul64(new $Uint64(0, 1461), n), new $Uint64(d.high + x$6.high, d.low + x$6.low));
		n = y;
		d = (x$7 = $mul64(new $Uint64(0, 365), n), new $Uint64(d.high + x$7.high, d.low + x$7.low));
		d = (x$8 = new $Uint64(0, daysBefore[(month - 1 >> 0)]), new $Uint64(d.high + x$8.high, d.low + x$8.low));
		if (isLeap(year) && month >= 3) {
			d = new $Uint64(d.high + 0, d.low + 1);
		}
		d = (x$9 = new $Uint64(0, (day - 1 >> 0)), new $Uint64(d.high + x$9.high, d.low + x$9.low));
		abs = $mul64(d, new $Uint64(0, 86400));
		abs = (x$10 = new $Uint64(0, ((((((hour >>> 16 << 16) * 3600 >> 0) + (hour << 16 >>> 16) * 3600) >> 0) + ((((min >>> 16 << 16) * 60 >> 0) + (min << 16 >>> 16) * 60) >> 0) >> 0) + sec >> 0)), new $Uint64(abs.high + x$10.high, abs.low + x$10.low));
		unix = (x$11 = new $Int64(abs.high, abs.low), new $Int64(x$11.high + -2147483647, x$11.low + 3844486912));
		_tuple$5 = loc.lookup(unix); offset = _tuple$5[1]; start = _tuple$5[3]; end = _tuple$5[4];
		if (!((offset === 0))) {
			utc = (x$12 = new $Int64(0, offset), new $Int64(unix.high - x$12.high, unix.low - x$12.low));
			if ((utc.high < start.high || (utc.high === start.high && utc.low < start.low))) {
				_tuple$6 = loc.lookup(new $Int64(start.high - 0, start.low - 1)); offset = _tuple$6[1];
			} else if ((utc.high > end.high || (utc.high === end.high && utc.low >= end.low))) {
				_tuple$7 = loc.lookup(end); offset = _tuple$7[1];
			}
			unix = (x$13 = new $Int64(0, offset), new $Int64(unix.high - x$13.high, unix.low - x$13.low));
		}
		return new Time.Ptr(new $Int64(unix.high + 14, unix.low + 2006054656), (nsec >>> 0), loc);
	};
	Time.Ptr.prototype.Truncate = function(d) {
		var _struct, t, _struct$1, _tuple, _struct$2, r, _struct$3;
		t = (_struct = this, new Time.Ptr(_struct.sec, _struct.nsec, _struct.loc));
		if ((d.high < 0 || (d.high === 0 && d.low <= 0))) {
			return (_struct$1 = t, new Time.Ptr(_struct$1.sec, _struct$1.nsec, _struct$1.loc));
		}
		_tuple = div((_struct$2 = t, new Time.Ptr(_struct$2.sec, _struct$2.nsec, _struct$2.loc)), d); r = _tuple[1];
		return (_struct$3 = t.Add(new Duration(-r.high, -r.low)), new Time.Ptr(_struct$3.sec, _struct$3.nsec, _struct$3.loc));
	};
	Time.prototype.Truncate = function(d) { return this.$val.Truncate(d); };
	Time.Ptr.prototype.Round = function(d) {
		var _struct, t, _struct$1, _tuple, _struct$2, r, x, _struct$3, _struct$4;
		t = (_struct = this, new Time.Ptr(_struct.sec, _struct.nsec, _struct.loc));
		if ((d.high < 0 || (d.high === 0 && d.low <= 0))) {
			return (_struct$1 = t, new Time.Ptr(_struct$1.sec, _struct$1.nsec, _struct$1.loc));
		}
		_tuple = div((_struct$2 = t, new Time.Ptr(_struct$2.sec, _struct$2.nsec, _struct$2.loc)), d); r = _tuple[1];
		if ((x = new Duration(r.high + r.high, r.low + r.low), (x.high < d.high || (x.high === d.high && x.low < d.low)))) {
			return (_struct$3 = t.Add(new Duration(-r.high, -r.low)), new Time.Ptr(_struct$3.sec, _struct$3.nsec, _struct$3.loc));
		}
		return (_struct$4 = t.Add(new Duration(d.high - r.high, d.low - r.low)), new Time.Ptr(_struct$4.sec, _struct$4.nsec, _struct$4.loc));
	};
	Time.prototype.Round = function(d) { return this.$val.Round(d); };
	div = function(t, d) {
		var qmod2, r, neg, nsec, x, x$1, x$2, x$3, x$4, _q, _r, x$5, d1, x$6, x$7, x$8, x$9, x$10, sec, tmp, u1, u0, _tmp, _tmp$1, u0x, _tmp$2, _tmp$3, x$11, d1$1, x$12, d0, _tmp$4, _tmp$5, x$13, x$14, x$15;
		qmod2 = 0;
		r = new Duration(0, 0);
		neg = false;
		nsec = (t.nsec >> 0);
		if ((x = t.sec, (x.high < 0 || (x.high === 0 && x.low < 0)))) {
			neg = true;
			t.sec = (x$1 = t.sec, new $Int64(-x$1.high, -x$1.low));
			nsec = -nsec;
			if (nsec < 0) {
				nsec = nsec + 1000000000 >> 0;
				t.sec = (x$2 = t.sec, new $Int64(x$2.high - 0, x$2.low - 1));
			}
		}
		if ((d.high < 0 || (d.high === 0 && d.low < 1000000000)) && (x$3 = $div64(new Duration(0, 1000000000), (new Duration(d.high + d.high, d.low + d.low)), true), (x$3.high === 0 && x$3.low === 0))) {
			qmod2 = ((_q = nsec / ((d.low + ((d.high >> 31) * 4294967296)) >> 0), (_q === _q && _q !== 1/0 && _q !== -1/0) ? _q >> 0 : $throwRuntimeError("integer divide by zero")) >> 0) & 1;
			r = new Duration(0, (_r = nsec % ((d.low + ((d.high >> 31) * 4294967296)) >> 0), _r === _r ? _r : $throwRuntimeError("integer divide by zero")));
		} else if ((x$4 = $div64(d, new Duration(0, 1000000000), true), (x$4.high === 0 && x$4.low === 0))) {
			d1 = (x$5 = $div64(d, new Duration(0, 1000000000), false), new $Int64(x$5.high, x$5.low));
			qmod2 = ((x$6 = $div64(t.sec, d1, false), x$6.low + ((x$6.high >> 31) * 4294967296)) >> 0) & 1;
			r = (x$7 = $mul64((x$8 = $div64(t.sec, d1, true), new Duration(x$8.high, x$8.low)), new Duration(0, 1000000000)), x$9 = new Duration(0, nsec), new Duration(x$7.high + x$9.high, x$7.low + x$9.low));
		} else {
			sec = (x$10 = t.sec, new $Uint64(x$10.high, x$10.low));
			tmp = $mul64(($shiftRightUint64(sec, 32)), new $Uint64(0, 1000000000));
			u1 = $shiftRightUint64(tmp, 32);
			u0 = $shiftLeft64(tmp, 32);
			tmp = $mul64(new $Uint64(sec.high & 0, (sec.low & 4294967295) >>> 0), new $Uint64(0, 1000000000));
			_tmp = u0; _tmp$1 = new $Uint64(u0.high + tmp.high, u0.low + tmp.low); u0x = _tmp; u0 = _tmp$1;
			if ((u0.high < u0x.high || (u0.high === u0x.high && u0.low < u0x.low))) {
				u1 = new $Uint64(u1.high + 0, u1.low + 1);
			}
			_tmp$2 = u0; _tmp$3 = (x$11 = new $Uint64(0, nsec), new $Uint64(u0.high + x$11.high, u0.low + x$11.low)); u0x = _tmp$2; u0 = _tmp$3;
			if ((u0.high < u0x.high || (u0.high === u0x.high && u0.low < u0x.low))) {
				u1 = new $Uint64(u1.high + 0, u1.low + 1);
			}
			d1$1 = new $Uint64(d.high, d.low);
			while (!((x$12 = $shiftRightUint64(d1$1, 63), (x$12.high === 0 && x$12.low === 1)))) {
				d1$1 = $shiftLeft64(d1$1, 1);
			}
			d0 = new $Uint64(0, 0);
			while (true) {
				qmod2 = 0;
				if ((u1.high > d1$1.high || (u1.high === d1$1.high && u1.low > d1$1.low)) || (u1.high === d1$1.high && u1.low === d1$1.low) && (u0.high > d0.high || (u0.high === d0.high && u0.low >= d0.low))) {
					qmod2 = 1;
					_tmp$4 = u0; _tmp$5 = new $Uint64(u0.high - d0.high, u0.low - d0.low); u0x = _tmp$4; u0 = _tmp$5;
					if ((u0.high > u0x.high || (u0.high === u0x.high && u0.low > u0x.low))) {
						u1 = new $Uint64(u1.high - 0, u1.low - 1);
					}
					u1 = (x$13 = d1$1, new $Uint64(u1.high - x$13.high, u1.low - x$13.low));
				}
				if ((d1$1.high === 0 && d1$1.low === 0) && (x$14 = new $Uint64(d.high, d.low), (d0.high === x$14.high && d0.low === x$14.low))) {
					break;
				}
				d0 = $shiftRightUint64(d0, 1);
				d0 = (x$15 = $shiftLeft64((new $Uint64(d1$1.high & 0, (d1$1.low & 1) >>> 0)), 63), new $Uint64(d0.high | x$15.high, (d0.low | x$15.low) >>> 0));
				d1$1 = $shiftRightUint64(d1$1, 1);
			}
			r = new Duration(u0.high, u0.low);
		}
		if (neg && !((r.high === 0 && r.low === 0))) {
			qmod2 = (qmod2 ^ 1) >> 0;
			r = new Duration(d.high - r.high, d.low - r.low);
		}
		return [qmod2, r];
	};
	Location.Ptr.prototype.get = function() {
		var l;
		l = this;
		if (l === ($ptrType(Location)).nil) {
			return utcLoc;
		}
		if (l === localLoc) {
			localOnce.Do(initLocal);
		}
		return l;
	};
	Location.prototype.get = function() { return this.$val.get(); };
	Location.Ptr.prototype.String = function() {
		var l;
		l = this;
		return l.get().name;
	};
	Location.prototype.String = function() { return this.$val.String(); };
	FixedZone = $pkg.FixedZone = function(name, offset) {
		var l, x;
		l = new Location.Ptr(name, new ($sliceType(zone))([new zone.Ptr(name, offset, false)]), new ($sliceType(zoneTrans))([new zoneTrans.Ptr(new $Int64(-2147483648, 0), 0, false, false)]), new $Int64(-2147483648, 0), new $Int64(2147483647, 4294967295), ($ptrType(zone)).nil);
		l.cacheZone = (x = l.zone, ((0 < 0 || 0 >= x.length) ? $throwRuntimeError("index out of range") : x.array[x.offset + 0]));
		return l;
	};
	Location.Ptr.prototype.lookup = function(sec) {
		var name, offset, isDST, start, end, l, zone$1, x, x$1, tx, lo, hi, _q, m, lim, x$2, x$3, zone$2;
		name = "";
		offset = 0;
		isDST = false;
		start = new $Int64(0, 0);
		end = new $Int64(0, 0);
		l = this;
		l = l.get();
		if (l.tx.length === 0) {
			name = "UTC";
			offset = 0;
			isDST = false;
			start = new $Int64(-2147483648, 0);
			end = new $Int64(2147483647, 4294967295);
			return [name, offset, isDST, start, end];
		}
		zone$1 = l.cacheZone;
		if (!(zone$1 === ($ptrType(zone)).nil) && (x = l.cacheStart, (x.high < sec.high || (x.high === sec.high && x.low <= sec.low))) && (x$1 = l.cacheEnd, (sec.high < x$1.high || (sec.high === x$1.high && sec.low < x$1.low)))) {
			name = zone$1.name;
			offset = zone$1.offset;
			isDST = zone$1.isDST;
			start = l.cacheStart;
			end = l.cacheEnd;
			return [name, offset, isDST, start, end];
		}
		tx = l.tx;
		end = new $Int64(2147483647, 4294967295);
		lo = 0;
		hi = tx.length;
		while ((hi - lo >> 0) > 1) {
			m = lo + (_q = ((hi - lo >> 0)) / 2, (_q === _q && _q !== 1/0 && _q !== -1/0) ? _q >> 0 : $throwRuntimeError("integer divide by zero")) >> 0;
			lim = ((m < 0 || m >= tx.length) ? $throwRuntimeError("index out of range") : tx.array[tx.offset + m]).when;
			if ((sec.high < lim.high || (sec.high === lim.high && sec.low < lim.low))) {
				end = lim;
				hi = m;
			} else {
				lo = m;
			}
		}
		zone$2 = (x$2 = l.zone, x$3 = ((lo < 0 || lo >= tx.length) ? $throwRuntimeError("index out of range") : tx.array[tx.offset + lo]).index, ((x$3 < 0 || x$3 >= x$2.length) ? $throwRuntimeError("index out of range") : x$2.array[x$2.offset + x$3]));
		name = zone$2.name;
		offset = zone$2.offset;
		isDST = zone$2.isDST;
		start = ((lo < 0 || lo >= tx.length) ? $throwRuntimeError("index out of range") : tx.array[tx.offset + lo]).when;
		return [name, offset, isDST, start, end];
	};
	Location.prototype.lookup = function(sec) { return this.$val.lookup(sec); };
	Location.Ptr.prototype.lookupName = function(name, unix) {
		var offset, isDST, ok, l, _ref, _i, i, x, zone$1, _tuple, x$1, nam, offset$1, isDST$1, _tmp, _tmp$1, _tmp$2, _ref$1, _i$1, i$1, x$2, zone$2, _tmp$3, _tmp$4, _tmp$5;
		offset = 0;
		isDST = false;
		ok = false;
		l = this;
		l = l.get();
		_ref = l.zone;
		_i = 0;
		while (_i < _ref.length) {
			i = _i;
			zone$1 = (x = l.zone, ((i < 0 || i >= x.length) ? $throwRuntimeError("index out of range") : x.array[x.offset + i]));
			if (zone$1.name === name) {
				_tuple = l.lookup((x$1 = new $Int64(0, zone$1.offset), new $Int64(unix.high - x$1.high, unix.low - x$1.low))); nam = _tuple[0]; offset$1 = _tuple[1]; isDST$1 = _tuple[2];
				if (nam === zone$1.name) {
					_tmp = offset$1; _tmp$1 = isDST$1; _tmp$2 = true; offset = _tmp; isDST = _tmp$1; ok = _tmp$2;
					return [offset, isDST, ok];
				}
			}
			_i++;
		}
		_ref$1 = l.zone;
		_i$1 = 0;
		while (_i$1 < _ref$1.length) {
			i$1 = _i$1;
			zone$2 = (x$2 = l.zone, ((i$1 < 0 || i$1 >= x$2.length) ? $throwRuntimeError("index out of range") : x$2.array[x$2.offset + i$1]));
			if (zone$2.name === name) {
				_tmp$3 = zone$2.offset; _tmp$4 = zone$2.isDST; _tmp$5 = true; offset = _tmp$3; isDST = _tmp$4; ok = _tmp$5;
				return [offset, isDST, ok];
			}
			_i$1++;
		}
		return [offset, isDST, ok];
	};
	Location.prototype.lookupName = function(name, unix) { return this.$val.lookupName(name, unix); };
	data.Ptr.prototype.read = function(n) {
		var d, p;
		d = this;
		if (d.p.length < n) {
			d.p = ($sliceType($Uint8)).nil;
			d.error = true;
			return ($sliceType($Uint8)).nil;
		}
		p = $subslice(d.p, 0, n);
		d.p = $subslice(d.p, n);
		return p;
	};
	data.prototype.read = function(n) { return this.$val.read(n); };
	data.Ptr.prototype.big4 = function() {
		var n, ok, d, p, _tmp, _tmp$1, _tmp$2, _tmp$3;
		n = 0;
		ok = false;
		d = this;
		p = d.read(4);
		if (p.length < 4) {
			d.error = true;
			_tmp = 0; _tmp$1 = false; n = _tmp; ok = _tmp$1;
			return [n, ok];
		}
		_tmp$2 = (((((((((0 < 0 || 0 >= p.length) ? $throwRuntimeError("index out of range") : p.array[p.offset + 0]) >>> 0) << 24 >>> 0) | ((((1 < 0 || 1 >= p.length) ? $throwRuntimeError("index out of range") : p.array[p.offset + 1]) >>> 0) << 16 >>> 0)) >>> 0) | ((((2 < 0 || 2 >= p.length) ? $throwRuntimeError("index out of range") : p.array[p.offset + 2]) >>> 0) << 8 >>> 0)) >>> 0) | (((3 < 0 || 3 >= p.length) ? $throwRuntimeError("index out of range") : p.array[p.offset + 3]) >>> 0)) >>> 0; _tmp$3 = true; n = _tmp$2; ok = _tmp$3;
		return [n, ok];
	};
	data.prototype.big4 = function() { return this.$val.big4(); };
	data.Ptr.prototype.byte$ = function() {
		var n, ok, d, p, _tmp, _tmp$1, _tmp$2, _tmp$3;
		n = 0;
		ok = false;
		d = this;
		p = d.read(1);
		if (p.length < 1) {
			d.error = true;
			_tmp = 0; _tmp$1 = false; n = _tmp; ok = _tmp$1;
			return [n, ok];
		}
		_tmp$2 = ((0 < 0 || 0 >= p.length) ? $throwRuntimeError("index out of range") : p.array[p.offset + 0]); _tmp$3 = true; n = _tmp$2; ok = _tmp$3;
		return [n, ok];
	};
	data.prototype.byte$ = function() { return this.$val.byte$(); };
	byteString = function(p) {
		var i;
		i = 0;
		while (i < p.length) {
			if (((i < 0 || i >= p.length) ? $throwRuntimeError("index out of range") : p.array[p.offset + i]) === 0) {
				return $bytesToString($subslice(p, 0, i));
			}
			i = i + 1 >> 0;
		}
		return $bytesToString(p);
	};
	loadZoneData = function(bytes) {
		var l, err, d, magic, _tmp, _tmp$1, p, _tmp$2, _tmp$3, n, i, _tuple, nn, ok, _tmp$4, _tmp$5, x, txtimes, txzones, x$1, zonedata, abbrev, x$2, isstd, isutc, _tmp$6, _tmp$7, zone$1, _ref, _i, i$1, ok$1, n$1, _tuple$1, _tmp$8, _tmp$9, b, _tuple$2, _tmp$10, _tmp$11, _tuple$3, _tmp$12, _tmp$13, tx, _ref$1, _i$1, i$2, ok$2, n$2, _tuple$4, _tmp$14, _tmp$15, _tmp$16, _tmp$17, _tuple$5, sec, _ref$2, _i$2, i$3, x$3, x$4, x$5, x$6, x$7, x$8, _tmp$18, _tmp$19;
		l = ($ptrType(Location)).nil;
		err = null;
		d = new data.Ptr(bytes, false);
		magic = d.read(4);
		if (!($bytesToString(magic) === "TZif")) {
			_tmp = ($ptrType(Location)).nil; _tmp$1 = badData; l = _tmp; err = _tmp$1;
			return [l, err];
		}
		p = ($sliceType($Uint8)).nil;
		p = d.read(16);
		if (!((p.length === 16)) || !((((0 < 0 || 0 >= p.length) ? $throwRuntimeError("index out of range") : p.array[p.offset + 0]) === 0)) && !((((0 < 0 || 0 >= p.length) ? $throwRuntimeError("index out of range") : p.array[p.offset + 0]) === 50))) {
			_tmp$2 = ($ptrType(Location)).nil; _tmp$3 = badData; l = _tmp$2; err = _tmp$3;
			return [l, err];
		}
		n = $makeNativeArray("Int", 6, function() { return 0; });
		i = 0;
		while (i < 6) {
			_tuple = d.big4(); nn = _tuple[0]; ok = _tuple[1];
			if (!ok) {
				_tmp$4 = ($ptrType(Location)).nil; _tmp$5 = badData; l = _tmp$4; err = _tmp$5;
				return [l, err];
			}
			n[i] = (nn >> 0);
			i = i + 1 >> 0;
		}
		txtimes = new data.Ptr(d.read((x = n[3], (((x >>> 16 << 16) * 4 >> 0) + (x << 16 >>> 16) * 4) >> 0)), false);
		txzones = d.read(n[3]);
		zonedata = new data.Ptr(d.read((x$1 = n[4], (((x$1 >>> 16 << 16) * 6 >> 0) + (x$1 << 16 >>> 16) * 6) >> 0)), false);
		abbrev = d.read(n[5]);
		d.read((x$2 = n[2], (((x$2 >>> 16 << 16) * 8 >> 0) + (x$2 << 16 >>> 16) * 8) >> 0));
		isstd = d.read(n[1]);
		isutc = d.read(n[0]);
		if (d.error) {
			_tmp$6 = ($ptrType(Location)).nil; _tmp$7 = badData; l = _tmp$6; err = _tmp$7;
			return [l, err];
		}
		zone$1 = ($sliceType(zone)).make(n[4], 0, function() { return new zone.Ptr(); });
		_ref = zone$1;
		_i = 0;
		while (_i < _ref.length) {
			i$1 = _i;
			ok$1 = false;
			n$1 = 0;
			_tuple$1 = zonedata.big4(); n$1 = _tuple$1[0]; ok$1 = _tuple$1[1];
			if (!ok$1) {
				_tmp$8 = ($ptrType(Location)).nil; _tmp$9 = badData; l = _tmp$8; err = _tmp$9;
				return [l, err];
			}
			((i$1 < 0 || i$1 >= zone$1.length) ? $throwRuntimeError("index out of range") : zone$1.array[zone$1.offset + i$1]).offset = ((n$1 >> 0) >> 0);
			b = 0;
			_tuple$2 = zonedata.byte$(); b = _tuple$2[0]; ok$1 = _tuple$2[1];
			if (!ok$1) {
				_tmp$10 = ($ptrType(Location)).nil; _tmp$11 = badData; l = _tmp$10; err = _tmp$11;
				return [l, err];
			}
			((i$1 < 0 || i$1 >= zone$1.length) ? $throwRuntimeError("index out of range") : zone$1.array[zone$1.offset + i$1]).isDST = !((b === 0));
			_tuple$3 = zonedata.byte$(); b = _tuple$3[0]; ok$1 = _tuple$3[1];
			if (!ok$1 || (b >> 0) >= abbrev.length) {
				_tmp$12 = ($ptrType(Location)).nil; _tmp$13 = badData; l = _tmp$12; err = _tmp$13;
				return [l, err];
			}
			((i$1 < 0 || i$1 >= zone$1.length) ? $throwRuntimeError("index out of range") : zone$1.array[zone$1.offset + i$1]).name = byteString($subslice(abbrev, b));
			_i++;
		}
		tx = ($sliceType(zoneTrans)).make(n[3], 0, function() { return new zoneTrans.Ptr(); });
		_ref$1 = tx;
		_i$1 = 0;
		while (_i$1 < _ref$1.length) {
			i$2 = _i$1;
			ok$2 = false;
			n$2 = 0;
			_tuple$4 = txtimes.big4(); n$2 = _tuple$4[0]; ok$2 = _tuple$4[1];
			if (!ok$2) {
				_tmp$14 = ($ptrType(Location)).nil; _tmp$15 = badData; l = _tmp$14; err = _tmp$15;
				return [l, err];
			}
			((i$2 < 0 || i$2 >= tx.length) ? $throwRuntimeError("index out of range") : tx.array[tx.offset + i$2]).when = new $Int64(0, (n$2 >> 0));
			if ((((i$2 < 0 || i$2 >= txzones.length) ? $throwRuntimeError("index out of range") : txzones.array[txzones.offset + i$2]) >> 0) >= zone$1.length) {
				_tmp$16 = ($ptrType(Location)).nil; _tmp$17 = badData; l = _tmp$16; err = _tmp$17;
				return [l, err];
			}
			((i$2 < 0 || i$2 >= tx.length) ? $throwRuntimeError("index out of range") : tx.array[tx.offset + i$2]).index = ((i$2 < 0 || i$2 >= txzones.length) ? $throwRuntimeError("index out of range") : txzones.array[txzones.offset + i$2]);
			if (i$2 < isstd.length) {
				((i$2 < 0 || i$2 >= tx.length) ? $throwRuntimeError("index out of range") : tx.array[tx.offset + i$2]).isstd = !((((i$2 < 0 || i$2 >= isstd.length) ? $throwRuntimeError("index out of range") : isstd.array[isstd.offset + i$2]) === 0));
			}
			if (i$2 < isutc.length) {
				((i$2 < 0 || i$2 >= tx.length) ? $throwRuntimeError("index out of range") : tx.array[tx.offset + i$2]).isutc = !((((i$2 < 0 || i$2 >= isutc.length) ? $throwRuntimeError("index out of range") : isutc.array[isutc.offset + i$2]) === 0));
			}
			_i$1++;
		}
		if (tx.length === 0) {
			tx = $append(tx, new zoneTrans.Ptr(new $Int64(-2147483648, 0), 0, false, false));
		}
		l = new Location.Ptr("", zone$1, tx, new $Int64(0, 0), new $Int64(0, 0), ($ptrType(zone)).nil);
		_tuple$5 = now(); sec = _tuple$5[0];
		_ref$2 = tx;
		_i$2 = 0;
		while (_i$2 < _ref$2.length) {
			i$3 = _i$2;
			if ((x$3 = ((i$3 < 0 || i$3 >= tx.length) ? $throwRuntimeError("index out of range") : tx.array[tx.offset + i$3]).when, (x$3.high < sec.high || (x$3.high === sec.high && x$3.low <= sec.low))) && (((i$3 + 1 >> 0) === tx.length) || (x$4 = (x$5 = i$3 + 1 >> 0, ((x$5 < 0 || x$5 >= tx.length) ? $throwRuntimeError("index out of range") : tx.array[tx.offset + x$5])).when, (sec.high < x$4.high || (sec.high === x$4.high && sec.low < x$4.low))))) {
				l.cacheStart = ((i$3 < 0 || i$3 >= tx.length) ? $throwRuntimeError("index out of range") : tx.array[tx.offset + i$3]).when;
				l.cacheEnd = new $Int64(2147483647, 4294967295);
				if ((i$3 + 1 >> 0) < tx.length) {
					l.cacheEnd = (x$6 = i$3 + 1 >> 0, ((x$6 < 0 || x$6 >= tx.length) ? $throwRuntimeError("index out of range") : tx.array[tx.offset + x$6])).when;
				}
				l.cacheZone = (x$7 = l.zone, x$8 = ((i$3 < 0 || i$3 >= tx.length) ? $throwRuntimeError("index out of range") : tx.array[tx.offset + i$3]).index, ((x$8 < 0 || x$8 >= x$7.length) ? $throwRuntimeError("index out of range") : x$7.array[x$7.offset + x$8]));
			}
			_i$2++;
		}
		_tmp$18 = l; _tmp$19 = null; l = _tmp$18; err = _tmp$19;
		return [l, err];
	};
	loadZoneFile = function(dir, name) {
		var l, err, _tuple, _tuple$1, buf, _tuple$2;
		l = ($ptrType(Location)).nil;
		err = null;
		if (dir.length > 4 && dir.substring((dir.length - 4 >> 0)) === ".zip") {
			_tuple = loadZoneZip(dir, name); l = _tuple[0]; err = _tuple[1];
			return [l, err];
		}
		if (!(dir === "")) {
			name = dir + "/" + name;
		}
		_tuple$1 = readFile(name); buf = _tuple$1[0]; err = _tuple$1[1];
		if (!($interfaceIsEqual(err, null))) {
			return [l, err];
		}
		_tuple$2 = loadZoneData(buf); l = _tuple$2[0]; err = _tuple$2[1];
		return [l, err];
	};
	get4 = function(b) {
		if (b.length < 4) {
			return 0;
		}
		return (((((0 < 0 || 0 >= b.length) ? $throwRuntimeError("index out of range") : b.array[b.offset + 0]) >> 0) | ((((1 < 0 || 1 >= b.length) ? $throwRuntimeError("index out of range") : b.array[b.offset + 1]) >> 0) << 8 >> 0)) | ((((2 < 0 || 2 >= b.length) ? $throwRuntimeError("index out of range") : b.array[b.offset + 2]) >> 0) << 16 >> 0)) | ((((3 < 0 || 3 >= b.length) ? $throwRuntimeError("index out of range") : b.array[b.offset + 3]) >> 0) << 24 >> 0);
	};
	get2 = function(b) {
		if (b.length < 2) {
			return 0;
		}
		return (((0 < 0 || 0 >= b.length) ? $throwRuntimeError("index out of range") : b.array[b.offset + 0]) >> 0) | ((((1 < 0 || 1 >= b.length) ? $throwRuntimeError("index out of range") : b.array[b.offset + 1]) >> 0) << 8 >> 0);
	};
	loadZoneZip = function(zipfile, name) {
		var l, err, _tuple, fd, _tmp, _tmp$1, buf, err$1, _tmp$2, _tmp$3, n, size, off, err$2, _tmp$4, _tmp$5, i, meth, size$1, namelen, xlen, fclen, off$1, zname, _tmp$6, _tmp$7, err$3, _tmp$8, _tmp$9, err$4, _tmp$10, _tmp$11, _tuple$1, _tmp$12, _tmp$13;
		l = ($ptrType(Location)).nil;
		err = null;
		var $deferred = [];
		try {
			_tuple = open(zipfile); fd = _tuple[0]; err = _tuple[1];
			if (!($interfaceIsEqual(err, null))) {
				_tmp = ($ptrType(Location)).nil; _tmp$1 = errors.New("open " + zipfile + ": " + err.Error()); l = _tmp; err = _tmp$1;
				return [l, err];
			}
			$deferred.push({ fun: closefd, args: [fd] });
			buf = ($sliceType($Uint8)).make(22, 0, function() { return 0; });
			err$1 = preadn(fd, buf, -22);
			if (!($interfaceIsEqual(err$1, null)) || !((get4(buf) === 101010256))) {
				_tmp$2 = ($ptrType(Location)).nil; _tmp$3 = errors.New("corrupt zip file " + zipfile); l = _tmp$2; err = _tmp$3;
				return [l, err];
			}
			n = get2($subslice(buf, 10));
			size = get4($subslice(buf, 12));
			off = get4($subslice(buf, 16));
			buf = ($sliceType($Uint8)).make(size, 0, function() { return 0; });
			err$2 = preadn(fd, buf, off);
			if (!($interfaceIsEqual(err$2, null))) {
				_tmp$4 = ($ptrType(Location)).nil; _tmp$5 = errors.New("corrupt zip file " + zipfile); l = _tmp$4; err = _tmp$5;
				return [l, err];
			}
			i = 0;
			while (i < n) {
				if (!((get4(buf) === 33639248))) {
					break;
				}
				meth = get2($subslice(buf, 10));
				size$1 = get4($subslice(buf, 24));
				namelen = get2($subslice(buf, 28));
				xlen = get2($subslice(buf, 30));
				fclen = get2($subslice(buf, 32));
				off$1 = get4($subslice(buf, 42));
				zname = $subslice(buf, 46, (46 + namelen >> 0));
				buf = $subslice(buf, (((46 + namelen >> 0) + xlen >> 0) + fclen >> 0));
				if (!($bytesToString(zname) === name)) {
					i = i + 1 >> 0;
					continue;
				}
				if (!((meth === 0))) {
					_tmp$6 = ($ptrType(Location)).nil; _tmp$7 = errors.New("unsupported compression for " + name + " in " + zipfile); l = _tmp$6; err = _tmp$7;
					return [l, err];
				}
				buf = ($sliceType($Uint8)).make((30 + namelen >> 0), 0, function() { return 0; });
				err$3 = preadn(fd, buf, off$1);
				if (!($interfaceIsEqual(err$3, null)) || !((get4(buf) === 67324752)) || !((get2($subslice(buf, 8)) === meth)) || !((get2($subslice(buf, 26)) === namelen)) || !($bytesToString($subslice(buf, 30, (30 + namelen >> 0))) === name)) {
					_tmp$8 = ($ptrType(Location)).nil; _tmp$9 = errors.New("corrupt zip file " + zipfile); l = _tmp$8; err = _tmp$9;
					return [l, err];
				}
				xlen = get2($subslice(buf, 28));
				buf = ($sliceType($Uint8)).make(size$1, 0, function() { return 0; });
				err$4 = preadn(fd, buf, ((off$1 + 30 >> 0) + namelen >> 0) + xlen >> 0);
				if (!($interfaceIsEqual(err$4, null))) {
					_tmp$10 = ($ptrType(Location)).nil; _tmp$11 = errors.New("corrupt zip file " + zipfile); l = _tmp$10; err = _tmp$11;
					return [l, err];
				}
				_tuple$1 = loadZoneData(buf); l = _tuple$1[0]; err = _tuple$1[1];
				return [l, err];
			}
			_tmp$12 = ($ptrType(Location)).nil; _tmp$13 = errors.New("cannot find " + name + " in zip file " + zipfile); l = _tmp$12; err = _tmp$13;
			return [l, err];
		} catch($err) {
			$pushErr($err);
		} finally {
			$callDeferred($deferred);
			return [l, err];
		}
	};
	initLocal = function() {
		var _tuple, tz, ok, _tuple$1, z, err, _struct, _tuple$2, z$1, err$1, _struct$1;
		_tuple = syscall.Getenv("TZ"); tz = _tuple[0]; ok = _tuple[1];
		if (!ok) {
			_tuple$1 = loadZoneFile("", "/etc/localtime"); z = _tuple$1[0]; err = _tuple$1[1];
			if ($interfaceIsEqual(err, null)) {
				localLoc = (_struct = z, new Location.Ptr(_struct.name, _struct.zone, _struct.tx, _struct.cacheStart, _struct.cacheEnd, _struct.cacheZone));
				localLoc.name = "Local";
				return;
			}
		} else if (!(tz === "") && !(tz === "UTC")) {
			_tuple$2 = loadLocation(tz); z$1 = _tuple$2[0]; err$1 = _tuple$2[1];
			if ($interfaceIsEqual(err$1, null)) {
				localLoc = (_struct$1 = z$1, new Location.Ptr(_struct$1.name, _struct$1.zone, _struct$1.tx, _struct$1.cacheStart, _struct$1.cacheEnd, _struct$1.cacheZone));
				return;
			}
		}
		localLoc.name = "UTC";
	};
	loadLocation = function(name) {
		var _ref, _i, zoneDir, _tuple, z, err;
		_ref = zoneDirs;
		_i = 0;
		while (_i < _ref.length) {
			zoneDir = ((_i < 0 || _i >= _ref.length) ? $throwRuntimeError("index out of range") : _ref.array[_ref.offset + _i]);
			_tuple = loadZoneFile(zoneDir, name); z = _tuple[0]; err = _tuple[1];
			if ($interfaceIsEqual(err, null)) {
				z.name = name;
				return [z, null];
			}
			_i++;
		}
		return [($ptrType(Location)).nil, errors.New("unknown time zone " + name)];
	};
	$pkg.init = function() {
		($ptrType(ParseError)).methods = [["Error", "Error", "", [], [$String], false, -1]];
		ParseError.init([["Layout", "Layout", "", $String, ""], ["Value", "Value", "", $String, ""], ["LayoutElem", "LayoutElem", "", $String, ""], ["ValueElem", "ValueElem", "", $String, ""], ["Message", "Message", "", $String, ""]]);
		Time.methods = [["Add", "Add", "", [Duration], [Time], false, -1], ["AddDate", "AddDate", "", [$Int, $Int, $Int], [Time], false, -1], ["After", "After", "", [Time], [$Bool], false, -1], ["Before", "Before", "", [Time], [$Bool], false, -1], ["Clock", "Clock", "", [], [$Int, $Int, $Int], false, -1], ["Date", "Date", "", [], [$Int, Month, $Int], false, -1], ["Day", "Day", "", [], [$Int], false, -1], ["Equal", "Equal", "", [Time], [$Bool], false, -1], ["Format", "Format", "", [$String], [$String], false, -1], ["GobEncode", "GobEncode", "", [], [($sliceType($Uint8)), $error], false, -1], ["Hour", "Hour", "", [], [$Int], false, -1], ["ISOWeek", "ISOWeek", "", [], [$Int, $Int], false, -1], ["In", "In", "", [($ptrType(Location))], [Time], false, -1], ["IsZero", "IsZero", "", [], [$Bool], false, -1], ["Local", "Local", "", [], [Time], false, -1], ["Location", "Location", "", [], [($ptrType(Location))], false, -1], ["MarshalBinary", "MarshalBinary", "", [], [($sliceType($Uint8)), $error], false, -1], ["MarshalJSON", "MarshalJSON", "", [], [($sliceType($Uint8)), $error], false, -1], ["MarshalText", "MarshalText", "", [], [($sliceType($Uint8)), $error], false, -1], ["Minute", "Minute", "", [], [$Int], false, -1], ["Month", "Month", "", [], [Month], false, -1], ["Nanosecond", "Nanosecond", "", [], [$Int], false, -1], ["Round", "Round", "", [Duration], [Time], false, -1], ["Second", "Second", "", [], [$Int], false, -1], ["String", "String", "", [], [$String], false, -1], ["Sub", "Sub", "", [Time], [Duration], false, -1], ["Truncate", "Truncate", "", [Duration], [Time], false, -1], ["UTC", "UTC", "", [], [Time], false, -1], ["Unix", "Unix", "", [], [$Int64], false, -1], ["UnixNano", "UnixNano", "", [], [$Int64], false, -1], ["Weekday", "Weekday", "", [], [Weekday], false, -1], ["Year", "Year", "", [], [$Int], false, -1], ["YearDay", "YearDay", "", [], [$Int], false, -1], ["Zone", "Zone", "", [], [$String, $Int], false, -1], ["abs", "abs", "time", [], [$Uint64], false, -1], ["date", "date", "time", [$Bool], [$Int, Month, $Int, $Int], false, -1], ["locabs", "locabs", "time", [], [$String, $Int, $Uint64], false, -1]];
		($ptrType(Time)).methods = [["Add", "Add", "", [Duration], [Time], false, -1], ["AddDate", "AddDate", "", [$Int, $Int, $Int], [Time], false, -1], ["After", "After", "", [Time], [$Bool], false, -1], ["Before", "Before", "", [Time], [$Bool], false, -1], ["Clock", "Clock", "", [], [$Int, $Int, $Int], false, -1], ["Date", "Date", "", [], [$Int, Month, $Int], false, -1], ["Day", "Day", "", [], [$Int], false, -1], ["Equal", "Equal", "", [Time], [$Bool], false, -1], ["Format", "Format", "", [$String], [$String], false, -1], ["GobDecode", "GobDecode", "", [($sliceType($Uint8))], [$error], false, -1], ["GobEncode", "GobEncode", "", [], [($sliceType($Uint8)), $error], false, -1], ["Hour", "Hour", "", [], [$Int], false, -1], ["ISOWeek", "ISOWeek", "", [], [$Int, $Int], false, -1], ["In", "In", "", [($ptrType(Location))], [Time], false, -1], ["IsZero", "IsZero", "", [], [$Bool], false, -1], ["Local", "Local", "", [], [Time], false, -1], ["Location", "Location", "", [], [($ptrType(Location))], false, -1], ["MarshalBinary", "MarshalBinary", "", [], [($sliceType($Uint8)), $error], false, -1], ["MarshalJSON", "MarshalJSON", "", [], [($sliceType($Uint8)), $error], false, -1], ["MarshalText", "MarshalText", "", [], [($sliceType($Uint8)), $error], false, -1], ["Minute", "Minute", "", [], [$Int], false, -1], ["Month", "Month", "", [], [Month], false, -1], ["Nanosecond", "Nanosecond", "", [], [$Int], false, -1], ["Round", "Round", "", [Duration], [Time], false, -1], ["Second", "Second", "", [], [$Int], false, -1], ["String", "String", "", [], [$String], false, -1], ["Sub", "Sub", "", [Time], [Duration], false, -1], ["Truncate", "Truncate", "", [Duration], [Time], false, -1], ["UTC", "UTC", "", [], [Time], false, -1], ["Unix", "Unix", "", [], [$Int64], false, -1], ["UnixNano", "UnixNano", "", [], [$Int64], false, -1], ["UnmarshalBinary", "UnmarshalBinary", "", [($sliceType($Uint8))], [$error], false, -1], ["UnmarshalJSON", "UnmarshalJSON", "", [($sliceType($Uint8))], [$error], false, -1], ["UnmarshalText", "UnmarshalText", "", [($sliceType($Uint8))], [$error], false, -1], ["Weekday", "Weekday", "", [], [Weekday], false, -1], ["Year", "Year", "", [], [$Int], false, -1], ["YearDay", "YearDay", "", [], [$Int], false, -1], ["Zone", "Zone", "", [], [$String, $Int], false, -1], ["abs", "abs", "time", [], [$Uint64], false, -1], ["date", "date", "time", [$Bool], [$Int, Month, $Int, $Int], false, -1], ["locabs", "locabs", "time", [], [$String, $Int, $Uint64], false, -1]];
		Time.init([["sec", "sec", "time", $Int64, ""], ["nsec", "nsec", "time", $Uintptr, ""], ["loc", "loc", "time", ($ptrType(Location)), ""]]);
		Month.methods = [["String", "String", "", [], [$String], false, -1]];
		($ptrType(Month)).methods = [["String", "String", "", [], [$String], false, -1]];
		Weekday.methods = [["String", "String", "", [], [$String], false, -1]];
		($ptrType(Weekday)).methods = [["String", "String", "", [], [$String], false, -1]];
		Duration.methods = [["Hours", "Hours", "", [], [$Float64], false, -1], ["Minutes", "Minutes", "", [], [$Float64], false, -1], ["Nanoseconds", "Nanoseconds", "", [], [$Int64], false, -1], ["Seconds", "Seconds", "", [], [$Float64], false, -1], ["String", "String", "", [], [$String], false, -1]];
		($ptrType(Duration)).methods = [["Hours", "Hours", "", [], [$Float64], false, -1], ["Minutes", "Minutes", "", [], [$Float64], false, -1], ["Nanoseconds", "Nanoseconds", "", [], [$Int64], false, -1], ["Seconds", "Seconds", "", [], [$Float64], false, -1], ["String", "String", "", [], [$String], false, -1]];
		($ptrType(Location)).methods = [["String", "String", "", [], [$String], false, -1], ["get", "get", "time", [], [($ptrType(Location))], false, -1], ["lookup", "lookup", "time", [$Int64], [$String, $Int, $Bool, $Int64, $Int64], false, -1], ["lookupName", "lookupName", "time", [$String, $Int64], [$Int, $Bool, $Bool], false, -1]];
		Location.init([["name", "name", "time", $String, ""], ["zone", "zone", "time", ($sliceType(zone)), ""], ["tx", "tx", "time", ($sliceType(zoneTrans)), ""], ["cacheStart", "cacheStart", "time", $Int64, ""], ["cacheEnd", "cacheEnd", "time", $Int64, ""], ["cacheZone", "cacheZone", "time", ($ptrType(zone)), ""]]);
		zone.init([["name", "name", "time", $String, ""], ["offset", "offset", "time", $Int, ""], ["isDST", "isDST", "time", $Bool, ""]]);
		zoneTrans.init([["when", "when", "time", $Int64, ""], ["index", "index", "time", $Uint8, ""], ["isstd", "isstd", "time", $Bool, ""], ["isutc", "isutc", "time", $Bool, ""]]);
		($ptrType(data)).methods = [["big4", "big4", "time", [], [$Uint32, $Bool], false, -1], ["byte$", "byte", "time", [], [$Uint8, $Bool], false, -1], ["read", "read", "time", [$Int], [($sliceType($Uint8))], false, -1]];
		data.init([["p", "p", "time", ($sliceType($Uint8)), ""], ["error", "error", "time", $Bool, ""]]);
		localLoc = new Location.Ptr();
		localOnce = new sync.Once.Ptr();
		std0x = $toNativeArray("Int", [260, 265, 524, 526, 528, 274]);
		longDayNames = new ($sliceType($String))(["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]);
		shortDayNames = new ($sliceType($String))(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
		shortMonthNames = new ($sliceType($String))(["---", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]);
		longMonthNames = new ($sliceType($String))(["---", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]);
		atoiError = errors.New("time: invalid number");
		errBad = errors.New("bad value for field");
		errLeadingInt = errors.New("time: bad [0-9]*");
		months = $toNativeArray("String", ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]);
		days = $toNativeArray("String", ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]);
		daysBefore = $toNativeArray("Int32", [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334, 365]);
		utcLoc = new Location.Ptr("UTC", ($sliceType(zone)).nil, ($sliceType(zoneTrans)).nil, new $Int64(0, 0), new $Int64(0, 0), ($ptrType(zone)).nil);
		$pkg.UTC = utcLoc;
		$pkg.Local = localLoc;
		var _tuple;
		_tuple = syscall.Getenv("ZONEINFO"); zoneinfo = _tuple[0];
		badData = errors.New("malformed time zone information");
		zoneDirs = new ($sliceType($String))(["/usr/share/zoneinfo/", "/usr/share/lib/zoneinfo/", "/usr/lib/locale/TZ/", runtime.GOROOT() + "/lib/time/zoneinfo.zip"]);
	};
	return $pkg;
})();
$packages["os"] = (function() {
	var $pkg = {}, js = $packages["github.com/gopherjs/gopherjs/js"], io = $packages["io"], syscall = $packages["syscall"], time = $packages["time"], errors = $packages["errors"], runtime = $packages["runtime"], atomic = $packages["sync/atomic"], sync = $packages["sync"], PathError, SyscallError, File, file, dirInfo, FileInfo, FileMode, fileStat, NewSyscallError, sigpipe, syscallMode, NewFile, epipecheck, Lstat, basename, fileInfoFromStat, timespecToTime, lstat;
	PathError = $pkg.PathError = $newType(0, "Struct", "os.PathError", "PathError", "os", function(Op_, Path_, Err_) {
		this.$val = this;
		this.Op = Op_ !== undefined ? Op_ : "";
		this.Path = Path_ !== undefined ? Path_ : "";
		this.Err = Err_ !== undefined ? Err_ : null;
	});
	SyscallError = $pkg.SyscallError = $newType(0, "Struct", "os.SyscallError", "SyscallError", "os", function(Syscall_, Err_) {
		this.$val = this;
		this.Syscall = Syscall_ !== undefined ? Syscall_ : "";
		this.Err = Err_ !== undefined ? Err_ : null;
	});
	File = $pkg.File = $newType(0, "Struct", "os.File", "File", "os", function(file_) {
		this.$val = this;
		this.file = file_ !== undefined ? file_ : ($ptrType(file)).nil;
	});
	file = $pkg.file = $newType(0, "Struct", "os.file", "file", "os", function(fd_, name_, dirinfo_, nepipe_) {
		this.$val = this;
		this.fd = fd_ !== undefined ? fd_ : 0;
		this.name = name_ !== undefined ? name_ : "";
		this.dirinfo = dirinfo_ !== undefined ? dirinfo_ : ($ptrType(dirInfo)).nil;
		this.nepipe = nepipe_ !== undefined ? nepipe_ : 0;
	});
	dirInfo = $pkg.dirInfo = $newType(0, "Struct", "os.dirInfo", "dirInfo", "os", function(buf_, nbuf_, bufp_) {
		this.$val = this;
		this.buf = buf_ !== undefined ? buf_ : ($sliceType($Uint8)).nil;
		this.nbuf = nbuf_ !== undefined ? nbuf_ : 0;
		this.bufp = bufp_ !== undefined ? bufp_ : 0;
	});
	FileInfo = $pkg.FileInfo = $newType(8, "Interface", "os.FileInfo", "FileInfo", "os", null);
	FileMode = $pkg.FileMode = $newType(4, "Uint32", "os.FileMode", "FileMode", "os", null);
	fileStat = $pkg.fileStat = $newType(0, "Struct", "os.fileStat", "fileStat", "os", function(name_, size_, mode_, modTime_, sys_) {
		this.$val = this;
		this.name = name_ !== undefined ? name_ : "";
		this.size = size_ !== undefined ? size_ : new $Int64(0, 0);
		this.mode = mode_ !== undefined ? mode_ : 0;
		this.modTime = modTime_ !== undefined ? modTime_ : new time.Time.Ptr();
		this.sys = sys_ !== undefined ? sys_ : null;
	});
	File.Ptr.prototype.readdirnames = function(n) {
		var names, err, f, d, size, errno, _tuple, _tmp, _tmp$1, _tmp$2, _tmp$3, nb, nc, _tuple$1, _tmp$4, _tmp$5, _tmp$6, _tmp$7;
		names = ($sliceType($String)).nil;
		err = null;
		f = this;
		if (f.file.dirinfo === ($ptrType(dirInfo)).nil) {
			f.file.dirinfo = new dirInfo.Ptr();
			f.file.dirinfo.buf = ($sliceType($Uint8)).make(4096, 0, function() { return 0; });
		}
		d = f.file.dirinfo;
		size = n;
		if (size <= 0) {
			size = 100;
			n = -1;
		}
		names = ($sliceType($String)).make(0, size, function() { return ""; });
		while (!((n === 0))) {
			if (d.bufp >= d.nbuf) {
				d.bufp = 0;
				errno = null;
				_tuple = syscall.ReadDirent(f.file.fd, d.buf); d.nbuf = _tuple[0]; errno = _tuple[1];
				if (!($interfaceIsEqual(errno, null))) {
					_tmp = names; _tmp$1 = NewSyscallError("readdirent", errno); names = _tmp; err = _tmp$1;
					return [names, err];
				}
				if (d.nbuf <= 0) {
					break;
				}
			}
			_tmp$2 = 0; _tmp$3 = 0; nb = _tmp$2; nc = _tmp$3;
			_tuple$1 = syscall.ParseDirent($subslice(d.buf, d.bufp, d.nbuf), n, names); nb = _tuple$1[0]; nc = _tuple$1[1]; names = _tuple$1[2];
			d.bufp = d.bufp + (nb) >> 0;
			n = n - (nc) >> 0;
		}
		if (n >= 0 && (names.length === 0)) {
			_tmp$4 = names; _tmp$5 = io.EOF; names = _tmp$4; err = _tmp$5;
			return [names, err];
		}
		_tmp$6 = names; _tmp$7 = null; names = _tmp$6; err = _tmp$7;
		return [names, err];
	};
	File.prototype.readdirnames = function(n) { return this.$val.readdirnames(n); };
	File.Ptr.prototype.Readdir = function(n) {
		var fi, err, f, _tmp, _tmp$1, _tuple;
		fi = ($sliceType(FileInfo)).nil;
		err = null;
		f = this;
		if (f === ($ptrType(File)).nil) {
			_tmp = ($sliceType(FileInfo)).nil; _tmp$1 = $pkg.ErrInvalid; fi = _tmp; err = _tmp$1;
			return [fi, err];
		}
		_tuple = f.readdir(n); fi = _tuple[0]; err = _tuple[1];
		return [fi, err];
	};
	File.prototype.Readdir = function(n) { return this.$val.Readdir(n); };
	File.Ptr.prototype.Readdirnames = function(n) {
		var names, err, f, _tmp, _tmp$1, _tuple;
		names = ($sliceType($String)).nil;
		err = null;
		f = this;
		if (f === ($ptrType(File)).nil) {
			_tmp = ($sliceType($String)).nil; _tmp$1 = $pkg.ErrInvalid; names = _tmp; err = _tmp$1;
			return [names, err];
		}
		_tuple = f.readdirnames(n); names = _tuple[0]; err = _tuple[1];
		return [names, err];
	};
	File.prototype.Readdirnames = function(n) { return this.$val.Readdirnames(n); };
	PathError.Ptr.prototype.Error = function() {
		var e;
		e = this;
		return e.Op + " " + e.Path + ": " + e.Err.Error();
	};
	PathError.prototype.Error = function() { return this.$val.Error(); };
	SyscallError.Ptr.prototype.Error = function() {
		var e;
		e = this;
		return e.Syscall + ": " + e.Err.Error();
	};
	SyscallError.prototype.Error = function() { return this.$val.Error(); };
	NewSyscallError = $pkg.NewSyscallError = function(syscall$1, err) {
		if ($interfaceIsEqual(err, null)) {
			return null;
		}
		return new SyscallError.Ptr(syscall$1, err);
	};
	File.Ptr.prototype.Name = function() {
		var f;
		f = this;
		return f.file.name;
	};
	File.prototype.Name = function() { return this.$val.Name(); };
	File.Ptr.prototype.Read = function(b) {
		var n, err, f, _tmp, _tmp$1, _tuple, e, _tmp$2, _tmp$3, _tmp$4, _tmp$5;
		n = 0;
		err = null;
		f = this;
		if (f === ($ptrType(File)).nil) {
			_tmp = 0; _tmp$1 = $pkg.ErrInvalid; n = _tmp; err = _tmp$1;
			return [n, err];
		}
		_tuple = f.read(b); n = _tuple[0]; e = _tuple[1];
		if (n < 0) {
			n = 0;
		}
		if ((n === 0) && b.length > 0 && $interfaceIsEqual(e, null)) {
			_tmp$2 = 0; _tmp$3 = io.EOF; n = _tmp$2; err = _tmp$3;
			return [n, err];
		}
		if (!($interfaceIsEqual(e, null))) {
			err = new PathError.Ptr("read", f.file.name, e);
		}
		_tmp$4 = n; _tmp$5 = err; n = _tmp$4; err = _tmp$5;
		return [n, err];
	};
	File.prototype.Read = function(b) { return this.$val.Read(b); };
	File.Ptr.prototype.ReadAt = function(b, off) {
		var n, err, f, _tmp, _tmp$1, _tuple, m, e, _tmp$2, _tmp$3, x;
		n = 0;
		err = null;
		f = this;
		if (f === ($ptrType(File)).nil) {
			_tmp = 0; _tmp$1 = $pkg.ErrInvalid; n = _tmp; err = _tmp$1;
			return [n, err];
		}
		while (b.length > 0) {
			_tuple = f.pread(b, off); m = _tuple[0]; e = _tuple[1];
			if ((m === 0) && $interfaceIsEqual(e, null)) {
				_tmp$2 = n; _tmp$3 = io.EOF; n = _tmp$2; err = _tmp$3;
				return [n, err];
			}
			if (!($interfaceIsEqual(e, null))) {
				err = new PathError.Ptr("read", f.file.name, e);
				break;
			}
			n = n + (m) >> 0;
			b = $subslice(b, m);
			off = (x = new $Int64(0, m), new $Int64(off.high + x.high, off.low + x.low));
		}
		return [n, err];
	};
	File.prototype.ReadAt = function(b, off) { return this.$val.ReadAt(b, off); };
	File.Ptr.prototype.Write = function(b) {
		var n, err, f, _tmp, _tmp$1, _tuple, e, _tmp$2, _tmp$3;
		n = 0;
		err = null;
		f = this;
		if (f === ($ptrType(File)).nil) {
			_tmp = 0; _tmp$1 = $pkg.ErrInvalid; n = _tmp; err = _tmp$1;
			return [n, err];
		}
		_tuple = f.write(b); n = _tuple[0]; e = _tuple[1];
		if (n < 0) {
			n = 0;
		}
		epipecheck(f, e);
		if (!($interfaceIsEqual(e, null))) {
			err = new PathError.Ptr("write", f.file.name, e);
		}
		_tmp$2 = n; _tmp$3 = err; n = _tmp$2; err = _tmp$3;
		return [n, err];
	};
	File.prototype.Write = function(b) { return this.$val.Write(b); };
	File.Ptr.prototype.WriteAt = function(b, off) {
		var n, err, f, _tmp, _tmp$1, _tuple, m, e, x;
		n = 0;
		err = null;
		f = this;
		if (f === ($ptrType(File)).nil) {
			_tmp = 0; _tmp$1 = $pkg.ErrInvalid; n = _tmp; err = _tmp$1;
			return [n, err];
		}
		while (b.length > 0) {
			_tuple = f.pwrite(b, off); m = _tuple[0]; e = _tuple[1];
			if (!($interfaceIsEqual(e, null))) {
				err = new PathError.Ptr("write", f.file.name, e);
				break;
			}
			n = n + (m) >> 0;
			b = $subslice(b, m);
			off = (x = new $Int64(0, m), new $Int64(off.high + x.high, off.low + x.low));
		}
		return [n, err];
	};
	File.prototype.WriteAt = function(b, off) { return this.$val.WriteAt(b, off); };
	File.Ptr.prototype.Seek = function(offset, whence) {
		var ret, err, f, _tmp, _tmp$1, _tuple, r, e, _tmp$2, _tmp$3, _tmp$4, _tmp$5;
		ret = new $Int64(0, 0);
		err = null;
		f = this;
		if (f === ($ptrType(File)).nil) {
			_tmp = new $Int64(0, 0); _tmp$1 = $pkg.ErrInvalid; ret = _tmp; err = _tmp$1;
			return [ret, err];
		}
		_tuple = f.seek(offset, whence); r = _tuple[0]; e = _tuple[1];
		if ($interfaceIsEqual(e, null) && !(f.file.dirinfo === ($ptrType(dirInfo)).nil) && !((r.high === 0 && r.low === 0))) {
			e = new syscall.Errno(21);
		}
		if (!($interfaceIsEqual(e, null))) {
			_tmp$2 = new $Int64(0, 0); _tmp$3 = new PathError.Ptr("seek", f.file.name, e); ret = _tmp$2; err = _tmp$3;
			return [ret, err];
		}
		_tmp$4 = r; _tmp$5 = null; ret = _tmp$4; err = _tmp$5;
		return [ret, err];
	};
	File.prototype.Seek = function(offset, whence) { return this.$val.Seek(offset, whence); };
	File.Ptr.prototype.WriteString = function(s) {
		var ret, err, f, _tmp, _tmp$1, _tuple;
		ret = 0;
		err = null;
		f = this;
		if (f === ($ptrType(File)).nil) {
			_tmp = 0; _tmp$1 = $pkg.ErrInvalid; ret = _tmp; err = _tmp$1;
			return [ret, err];
		}
		_tuple = f.Write(new ($sliceType($Uint8))($stringToBytes(s))); ret = _tuple[0]; err = _tuple[1];
		return [ret, err];
	};
	File.prototype.WriteString = function(s) { return this.$val.WriteString(s); };
	File.Ptr.prototype.Chdir = function() {
		var f, e;
		f = this;
		if (f === ($ptrType(File)).nil) {
			return $pkg.ErrInvalid;
		}
		e = syscall.Fchdir(f.file.fd);
		if (!($interfaceIsEqual(e, null))) {
			return new PathError.Ptr("chdir", f.file.name, e);
		}
		return null;
	};
	File.prototype.Chdir = function() { return this.$val.Chdir(); };
	sigpipe = function() {
		throw $panic("Native function not implemented: sigpipe");
	};
	syscallMode = function(i) {
		var o;
		o = 0;
		o = (o | (((new FileMode(i)).Perm() >>> 0))) >>> 0;
		if (!((((i & 8388608) >>> 0) === 0))) {
			o = (o | 2048) >>> 0;
		}
		if (!((((i & 4194304) >>> 0) === 0))) {
			o = (o | 1024) >>> 0;
		}
		if (!((((i & 1048576) >>> 0) === 0))) {
			o = (o | 512) >>> 0;
		}
		return o;
	};
	File.Ptr.prototype.Chmod = function(mode) {
		var f, e;
		f = this;
		if (f === ($ptrType(File)).nil) {
			return $pkg.ErrInvalid;
		}
		e = syscall.Fchmod(f.file.fd, syscallMode(mode));
		if (!($interfaceIsEqual(e, null))) {
			return new PathError.Ptr("chmod", f.file.name, e);
		}
		return null;
	};
	File.prototype.Chmod = function(mode) { return this.$val.Chmod(mode); };
	File.Ptr.prototype.Chown = function(uid, gid) {
		var f, e;
		f = this;
		if (f === ($ptrType(File)).nil) {
			return $pkg.ErrInvalid;
		}
		e = syscall.Fchown(f.file.fd, uid, gid);
		if (!($interfaceIsEqual(e, null))) {
			return new PathError.Ptr("chown", f.file.name, e);
		}
		return null;
	};
	File.prototype.Chown = function(uid, gid) { return this.$val.Chown(uid, gid); };
	File.Ptr.prototype.Truncate = function(size) {
		var f, e;
		f = this;
		if (f === ($ptrType(File)).nil) {
			return $pkg.ErrInvalid;
		}
		e = syscall.Ftruncate(f.file.fd, size);
		if (!($interfaceIsEqual(e, null))) {
			return new PathError.Ptr("truncate", f.file.name, e);
		}
		return null;
	};
	File.prototype.Truncate = function(size) { return this.$val.Truncate(size); };
	File.Ptr.prototype.Sync = function() {
		var err, f, e;
		err = null;
		f = this;
		if (f === ($ptrType(File)).nil) {
			err = new syscall.Errno(22);
			return err;
		}
		e = syscall.Fsync(f.file.fd);
		if (!($interfaceIsEqual(e, null))) {
			err = NewSyscallError("fsync", e);
			return err;
		}
		err = null;
		return err;
	};
	File.prototype.Sync = function() { return this.$val.Sync(); };
	File.Ptr.prototype.Fd = function() {
		var f;
		f = this;
		if (f === ($ptrType(File)).nil) {
			return 4294967295;
		}
		return (f.file.fd >>> 0);
	};
	File.prototype.Fd = function() { return this.$val.Fd(); };
	NewFile = $pkg.NewFile = function(fd, name) {
		var fdi, f;
		fdi = (fd >> 0);
		if (fdi < 0) {
			return ($ptrType(File)).nil;
		}
		f = new File.Ptr(new file.Ptr(fdi, name, ($ptrType(dirInfo)).nil, 0));
		runtime.SetFinalizer(f.file, new ($funcType([($ptrType(file))], [$error], false))((function(recv) { return recv.close(); })));
		return f;
	};
	epipecheck = function(file$1, e) {
		var v, v$1;
		if ($interfaceIsEqual(e, new syscall.Errno(32))) {
			if (atomic.AddInt32(new ($ptrType($Int32))(function() { return file$1.file.nepipe; }, function(v) { file$1.file.nepipe = v;; }), 1) >= 10) {
				sigpipe();
			}
		} else {
			atomic.StoreInt32(new ($ptrType($Int32))(function() { return file$1.file.nepipe; }, function(v$1) { file$1.file.nepipe = v$1;; }), 0);
		}
	};
	File.Ptr.prototype.Close = function() {
		var f;
		f = this;
		if (f === ($ptrType(File)).nil) {
			return $pkg.ErrInvalid;
		}
		return f.file.close();
	};
	File.prototype.Close = function() { return this.$val.Close(); };
	file.Ptr.prototype.close = function() {
		var file$1, err, e;
		file$1 = this;
		if (file$1 === ($ptrType(file)).nil || file$1.fd < 0) {
			return new syscall.Errno(22);
		}
		err = null;
		e = syscall.Close(file$1.fd);
		if (!($interfaceIsEqual(e, null))) {
			err = new PathError.Ptr("close", file$1.name, e);
		}
		file$1.fd = -1;
		runtime.SetFinalizer(file$1, null);
		return err;
	};
	file.prototype.close = function() { return this.$val.close(); };
	File.Ptr.prototype.Stat = function() {
		var fi, err, f, _tmp, _tmp$1, stat, _tmp$2, _tmp$3, _tmp$4, _tmp$5;
		fi = null;
		err = null;
		f = this;
		if (f === ($ptrType(File)).nil) {
			_tmp = null; _tmp$1 = $pkg.ErrInvalid; fi = _tmp; err = _tmp$1;
			return [fi, err];
		}
		stat = new syscall.Stat_t.Ptr();
		err = syscall.Fstat(f.file.fd, stat);
		if (!($interfaceIsEqual(err, null))) {
			_tmp$2 = null; _tmp$3 = new PathError.Ptr("stat", f.file.name, err); fi = _tmp$2; err = _tmp$3;
			return [fi, err];
		}
		_tmp$4 = fileInfoFromStat(stat, f.file.name); _tmp$5 = null; fi = _tmp$4; err = _tmp$5;
		return [fi, err];
	};
	File.prototype.Stat = function() { return this.$val.Stat(); };
	Lstat = $pkg.Lstat = function(name) {
		var fi, err, stat, _tmp, _tmp$1, _tmp$2, _tmp$3;
		fi = null;
		err = null;
		stat = new syscall.Stat_t.Ptr();
		err = syscall.Lstat(name, stat);
		if (!($interfaceIsEqual(err, null))) {
			_tmp = null; _tmp$1 = new PathError.Ptr("lstat", name, err); fi = _tmp; err = _tmp$1;
			return [fi, err];
		}
		_tmp$2 = fileInfoFromStat(stat, name); _tmp$3 = null; fi = _tmp$2; err = _tmp$3;
		return [fi, err];
	};
	File.Ptr.prototype.readdir = function(n) {
		var fi, err, f, dirname, _tuple, names, _ref, _i, filename, i, _tuple$1, fip, lerr, _tmp, _tmp$1;
		fi = ($sliceType(FileInfo)).nil;
		err = null;
		f = this;
		dirname = f.file.name;
		if (dirname === "") {
			dirname = ".";
		}
		dirname = dirname + "/";
		_tuple = f.Readdirnames(n); names = _tuple[0]; err = _tuple[1];
		fi = ($sliceType(FileInfo)).make(names.length, 0, function() { return null; });
		_ref = names;
		_i = 0;
		while (_i < _ref.length) {
			filename = ((_i < 0 || _i >= _ref.length) ? $throwRuntimeError("index out of range") : _ref.array[_ref.offset + _i]);
			i = _i;
			_tuple$1 = lstat(dirname + filename); fip = _tuple$1[0]; lerr = _tuple$1[1];
			if (!($interfaceIsEqual(lerr, null))) {
				(i < 0 || i >= fi.length) ? $throwRuntimeError("index out of range") : fi.array[fi.offset + i] = new fileStat.Ptr(filename, new $Int64(0, 0), 0, new time.Time.Ptr(), null);
				_i++;
				continue;
			}
			(i < 0 || i >= fi.length) ? $throwRuntimeError("index out of range") : fi.array[fi.offset + i] = fip;
			_i++;
		}
		_tmp = fi; _tmp$1 = err; fi = _tmp; err = _tmp$1;
		return [fi, err];
	};
	File.prototype.readdir = function(n) { return this.$val.readdir(n); };
	File.Ptr.prototype.read = function(b) {
		var n, err, f, _tuple;
		n = 0;
		err = null;
		f = this;
		_tuple = syscall.Read(f.file.fd, b); n = _tuple[0]; err = _tuple[1];
		return [n, err];
	};
	File.prototype.read = function(b) { return this.$val.read(b); };
	File.Ptr.prototype.pread = function(b, off) {
		var n, err, f, _tuple;
		n = 0;
		err = null;
		f = this;
		_tuple = syscall.Pread(f.file.fd, b, off); n = _tuple[0]; err = _tuple[1];
		return [n, err];
	};
	File.prototype.pread = function(b, off) { return this.$val.pread(b, off); };
	File.Ptr.prototype.write = function(b) {
		var n, err, f, _tuple, m, err$1, _tmp, _tmp$1;
		n = 0;
		err = null;
		f = this;
		while (true) {
			_tuple = syscall.Write(f.file.fd, b); m = _tuple[0]; err$1 = _tuple[1];
			n = n + (m) >> 0;
			if (0 < m && m < b.length || $interfaceIsEqual(err$1, new syscall.Errno(4))) {
				b = $subslice(b, m);
				continue;
			}
			_tmp = n; _tmp$1 = err$1; n = _tmp; err = _tmp$1;
			return [n, err];
		}
	};
	File.prototype.write = function(b) { return this.$val.write(b); };
	File.Ptr.prototype.pwrite = function(b, off) {
		var n, err, f, _tuple;
		n = 0;
		err = null;
		f = this;
		_tuple = syscall.Pwrite(f.file.fd, b, off); n = _tuple[0]; err = _tuple[1];
		return [n, err];
	};
	File.prototype.pwrite = function(b, off) { return this.$val.pwrite(b, off); };
	File.Ptr.prototype.seek = function(offset, whence) {
		var ret, err, f, _tuple;
		ret = new $Int64(0, 0);
		err = null;
		f = this;
		_tuple = syscall.Seek(f.file.fd, offset, whence); ret = _tuple[0]; err = _tuple[1];
		return [ret, err];
	};
	File.prototype.seek = function(offset, whence) { return this.$val.seek(offset, whence); };
	basename = function(name) {
		var i;
		i = name.length - 1 >> 0;
		while (i > 0 && (name.charCodeAt(i) === 47)) {
			name = name.substring(0, i);
			i = i - 1 >> 0;
		}
		i = i - 1 >> 0;
		while (i >= 0) {
			if (name.charCodeAt(i) === 47) {
				name = name.substring((i + 1 >> 0));
				break;
			}
			i = i - 1 >> 0;
		}
		return name;
	};
	fileInfoFromStat = function(st, name) {
		var _struct, _struct$1, fs, _ref;
		fs = new fileStat.Ptr(basename(name), st.Size, 0, (_struct$1 = timespecToTime((_struct = st.Mtim, new syscall.Timespec.Ptr(_struct.Sec, _struct.Nsec))), new time.Time.Ptr(_struct$1.sec, _struct$1.nsec, _struct$1.loc)), st);
		fs.mode = (((st.Mode & 511) >>> 0) >>> 0);
		_ref = (st.Mode & 61440) >>> 0;
		if (_ref === 24576) {
			fs.mode = (fs.mode | 67108864) >>> 0;
		} else if (_ref === 8192) {
			fs.mode = (fs.mode | 69206016) >>> 0;
		} else if (_ref === 16384) {
			fs.mode = (fs.mode | 2147483648) >>> 0;
		} else if (_ref === 4096) {
			fs.mode = (fs.mode | 33554432) >>> 0;
		} else if (_ref === 40960) {
			fs.mode = (fs.mode | 134217728) >>> 0;
		} else if (_ref === 32768) {
		} else if (_ref === 49152) {
			fs.mode = (fs.mode | 16777216) >>> 0;
		}
		if (!((((st.Mode & 1024) >>> 0) === 0))) {
			fs.mode = (fs.mode | 4194304) >>> 0;
		}
		if (!((((st.Mode & 2048) >>> 0) === 0))) {
			fs.mode = (fs.mode | 8388608) >>> 0;
		}
		if (!((((st.Mode & 512) >>> 0) === 0))) {
			fs.mode = (fs.mode | 1048576) >>> 0;
		}
		return fs;
	};
	timespecToTime = function(ts) {
		var _struct;
		return (_struct = time.Unix(ts.Sec, ts.Nsec), new time.Time.Ptr(_struct.sec, _struct.nsec, _struct.loc));
	};
	FileMode.prototype.String = function() {
		var m, buf, w, _ref, _i, _rune, c, i, y, _ref$1, _i$1, _rune$1, c$1, i$1, y$1;
		m = this.$val;
		buf = $makeNativeArray("Uint8", 32, function() { return 0; });
		w = 0;
		_ref = "dalTLDpSugct";
		_i = 0;
		while (_i < _ref.length) {
			_rune = $decodeRune(_ref, _i);
			c = _rune[0];
			i = _i;
			if (!((((m & (((y = ((31 - i >> 0) >>> 0), y < 32 ? (1 << y) : 0) >>> 0))) >>> 0) === 0))) {
				buf[w] = (c << 24 >>> 24);
				w = w + 1 >> 0;
			}
			_i += _rune[1];
		}
		if (w === 0) {
			buf[w] = 45;
			w = w + 1 >> 0;
		}
		_ref$1 = "rwxrwxrwx";
		_i$1 = 0;
		while (_i$1 < _ref$1.length) {
			_rune$1 = $decodeRune(_ref$1, _i$1);
			c$1 = _rune$1[0];
			i$1 = _i$1;
			if (!((((m & (((y$1 = ((8 - i$1 >> 0) >>> 0), y$1 < 32 ? (1 << y$1) : 0) >>> 0))) >>> 0) === 0))) {
				buf[w] = (c$1 << 24 >>> 24);
			} else {
				buf[w] = 45;
			}
			w = w + 1 >> 0;
			_i$1 += _rune$1[1];
		}
		return $bytesToString($subslice(new ($sliceType($Uint8))(buf), 0, w));
	};
	$ptrType(FileMode).prototype.String = function() { return new FileMode(this.$get()).String(); };
	FileMode.prototype.IsDir = function() {
		var m;
		m = this.$val;
		return !((((m & 2147483648) >>> 0) === 0));
	};
	$ptrType(FileMode).prototype.IsDir = function() { return new FileMode(this.$get()).IsDir(); };
	FileMode.prototype.IsRegular = function() {
		var m;
		m = this.$val;
		return ((m & 2399141888) >>> 0) === 0;
	};
	$ptrType(FileMode).prototype.IsRegular = function() { return new FileMode(this.$get()).IsRegular(); };
	FileMode.prototype.Perm = function() {
		var m;
		m = this.$val;
		return (m & 511) >>> 0;
	};
	$ptrType(FileMode).prototype.Perm = function() { return new FileMode(this.$get()).Perm(); };
	fileStat.Ptr.prototype.Name = function() {
		var fs;
		fs = this;
		return fs.name;
	};
	fileStat.prototype.Name = function() { return this.$val.Name(); };
	fileStat.Ptr.prototype.IsDir = function() {
		var fs;
		fs = this;
		return (new FileMode(fs.Mode())).IsDir();
	};
	fileStat.prototype.IsDir = function() { return this.$val.IsDir(); };
	fileStat.Ptr.prototype.Size = function() {
		var fs;
		fs = this;
		return fs.size;
	};
	fileStat.prototype.Size = function() { return this.$val.Size(); };
	fileStat.Ptr.prototype.Mode = function() {
		var fs;
		fs = this;
		return fs.mode;
	};
	fileStat.prototype.Mode = function() { return this.$val.Mode(); };
	fileStat.Ptr.prototype.ModTime = function() {
		var fs, _struct;
		fs = this;
		return (_struct = fs.modTime, new time.Time.Ptr(_struct.sec, _struct.nsec, _struct.loc));
	};
	fileStat.prototype.ModTime = function() { return this.$val.ModTime(); };
	fileStat.Ptr.prototype.Sys = function() {
		var fs;
		fs = this;
		return fs.sys;
	};
	fileStat.prototype.Sys = function() { return this.$val.Sys(); };
	$pkg.init = function() {
		($ptrType(PathError)).methods = [["Error", "Error", "", [], [$String], false, -1]];
		PathError.init([["Op", "Op", "", $String, ""], ["Path", "Path", "", $String, ""], ["Err", "Err", "", $error, ""]]);
		($ptrType(SyscallError)).methods = [["Error", "Error", "", [], [$String], false, -1]];
		SyscallError.init([["Syscall", "Syscall", "", $String, ""], ["Err", "Err", "", $error, ""]]);
		File.methods = [["close", "close", "os", [], [$error], false, 0]];
		($ptrType(File)).methods = [["Chdir", "Chdir", "", [], [$error], false, -1], ["Chmod", "Chmod", "", [FileMode], [$error], false, -1], ["Chown", "Chown", "", [$Int, $Int], [$error], false, -1], ["Close", "Close", "", [], [$error], false, -1], ["Fd", "Fd", "", [], [$Uintptr], false, -1], ["Name", "Name", "", [], [$String], false, -1], ["Read", "Read", "", [($sliceType($Uint8))], [$Int, $error], false, -1], ["ReadAt", "ReadAt", "", [($sliceType($Uint8)), $Int64], [$Int, $error], false, -1], ["Readdir", "Readdir", "", [$Int], [($sliceType(FileInfo)), $error], false, -1], ["Readdirnames", "Readdirnames", "", [$Int], [($sliceType($String)), $error], false, -1], ["Seek", "Seek", "", [$Int64, $Int], [$Int64, $error], false, -1], ["Stat", "Stat", "", [], [FileInfo, $error], false, -1], ["Sync", "Sync", "", [], [$error], false, -1], ["Truncate", "Truncate", "", [$Int64], [$error], false, -1], ["Write", "Write", "", [($sliceType($Uint8))], [$Int, $error], false, -1], ["WriteAt", "WriteAt", "", [($sliceType($Uint8)), $Int64], [$Int, $error], false, -1], ["WriteString", "WriteString", "", [$String], [$Int, $error], false, -1], ["close", "close", "os", [], [$error], false, 0], ["pread", "pread", "os", [($sliceType($Uint8)), $Int64], [$Int, $error], false, -1], ["pwrite", "pwrite", "os", [($sliceType($Uint8)), $Int64], [$Int, $error], false, -1], ["read", "read", "os", [($sliceType($Uint8))], [$Int, $error], false, -1], ["readdir", "readdir", "os", [$Int], [($sliceType(FileInfo)), $error], false, -1], ["readdirnames", "readdirnames", "os", [$Int], [($sliceType($String)), $error], false, -1], ["seek", "seek", "os", [$Int64, $Int], [$Int64, $error], false, -1], ["write", "write", "os", [($sliceType($Uint8))], [$Int, $error], false, -1]];
		File.init([["file", "", "os", ($ptrType(file)), ""]]);
		($ptrType(file)).methods = [["close", "close", "os", [], [$error], false, -1]];
		file.init([["fd", "fd", "os", $Int, ""], ["name", "name", "os", $String, ""], ["dirinfo", "dirinfo", "os", ($ptrType(dirInfo)), ""], ["nepipe", "nepipe", "os", $Int32, ""]]);
		dirInfo.init([["buf", "buf", "os", ($sliceType($Uint8)), ""], ["nbuf", "nbuf", "os", $Int, ""], ["bufp", "bufp", "os", $Int, ""]]);
		FileInfo.init([["IsDir", "IsDir", "", [], [$Bool], false], ["ModTime", "ModTime", "", [], [time.Time], false], ["Mode", "Mode", "", [], [FileMode], false], ["Name", "Name", "", [], [$String], false], ["Size", "Size", "", [], [$Int64], false], ["Sys", "Sys", "", [], [$emptyInterface], false]]);
		FileMode.methods = [["IsDir", "IsDir", "", [], [$Bool], false, -1], ["IsRegular", "IsRegular", "", [], [$Bool], false, -1], ["Perm", "Perm", "", [], [FileMode], false, -1], ["String", "String", "", [], [$String], false, -1]];
		($ptrType(FileMode)).methods = [["IsDir", "IsDir", "", [], [$Bool], false, -1], ["IsRegular", "IsRegular", "", [], [$Bool], false, -1], ["Perm", "Perm", "", [], [FileMode], false, -1], ["String", "String", "", [], [$String], false, -1]];
		($ptrType(fileStat)).methods = [["IsDir", "IsDir", "", [], [$Bool], false, -1], ["ModTime", "ModTime", "", [], [time.Time], false, -1], ["Mode", "Mode", "", [], [FileMode], false, -1], ["Name", "Name", "", [], [$String], false, -1], ["Size", "Size", "", [], [$Int64], false, -1], ["Sys", "Sys", "", [], [$emptyInterface], false, -1]];
		fileStat.init([["name", "name", "os", $String, ""], ["size", "size", "os", $Int64, ""], ["mode", "mode", "os", FileMode, ""], ["modTime", "modTime", "os", time.Time, ""], ["sys", "sys", "os", $emptyInterface, ""]]);
		$pkg.Args = ($sliceType($String)).nil;
		$pkg.ErrInvalid = errors.New("invalid argument");
		$pkg.ErrPermission = errors.New("permission denied");
		$pkg.ErrExist = errors.New("file already exists");
		$pkg.ErrNotExist = errors.New("file does not exist");
		$pkg.Stdin = NewFile((syscall.Stdin >>> 0), "/dev/stdin");
		$pkg.Stdout = NewFile((syscall.Stdout >>> 0), "/dev/stdout");
		$pkg.Stderr = NewFile((syscall.Stderr >>> 0), "/dev/stderr");
		lstat = Lstat;
		var process, args, i;
		process = $global.process;
		if (!(process === undefined)) {
			args = process.argv;
			$pkg.Args = ($sliceType($String)).make(($parseInt(args.length) - 1 >> 0), 0, function() { return ""; });
			i = 0;
			while (i < ($parseInt(args.length) - 1 >> 0)) {
				(i < 0 || i >= $pkg.Args.length) ? $throwRuntimeError("index out of range") : $pkg.Args.array[$pkg.Args.offset + i] = $internalize(args[(i + 1 >> 0)], $String);
				i = i + 1 >> 0;
			}
		}
	};
	return $pkg;
})();
$packages["reflect"] = (function() {
	var $pkg = {}, js = $packages["github.com/gopherjs/gopherjs/js"], strconv = $packages["strconv"], sync = $packages["sync"], math = $packages["math"], runtime = $packages["runtime"], mapIter, Type, Kind, rtype, method, uncommonType, ChanDir, arrayType, chanType, funcType, imethod, interfaceType, mapType, ptrType, sliceType, structField, structType, Method, StructField, StructTag, fieldScan, Value, flag, ValueError, iword, jsType, reflectType, isWrapped, copyStruct, zeroVal, makeIword, makeValue, MakeSlice, jsObject, TypeOf, ValueOf, SliceOf, Zero, unsafe_New, makeInt, chanclose, chanrecv, chansend, makemap, mapaccess, mapassign, mapiterinit, mapiterkey, mapiternext, maplen, cvtDirect, Copy, methodReceiver, valueInterface, ifaceE2I, methodName, makeMethodValue, PtrTo, implements$1, directlyAssignable, haveIdenticalUnderlyingType, toType, overflowFloat32, typesMustMatch, MakeMap, New, convertOp, makeFloat, makeComplex, makeString, makeBytes, makeRunes, cvtInt, cvtUint, cvtFloatInt, cvtFloatUint, cvtIntFloat, cvtUintFloat, cvtFloat, cvtComplex, cvtIntString, cvtUintString, cvtBytesString, cvtStringBytes, cvtRunesString, cvtStringRunes, cvtT2I, cvtI2I, call, initialized, kindNames, uint8Type;
	mapIter = $pkg.mapIter = $newType(0, "Struct", "reflect.mapIter", "mapIter", "reflect", function(t_, m_, keys_, i_) {
		this.$val = this;
		this.t = t_ !== undefined ? t_ : null;
		this.m = m_ !== undefined ? m_ : null;
		this.keys = keys_ !== undefined ? keys_ : null;
		this.i = i_ !== undefined ? i_ : 0;
	});
	Type = $pkg.Type = $newType(8, "Interface", "reflect.Type", "Type", "reflect", null);
	Kind = $pkg.Kind = $newType(4, "Uint", "reflect.Kind", "Kind", "reflect", null);
	rtype = $pkg.rtype = $newType(0, "Struct", "reflect.rtype", "rtype", "reflect", function(size_, hash_, _$2_, align_, fieldAlign_, kind_, alg_, gc_, string_, uncommonType_, ptrToThis_) {
		this.$val = this;
		this.size = size_ !== undefined ? size_ : 0;
		this.hash = hash_ !== undefined ? hash_ : 0;
		this._$2 = _$2_ !== undefined ? _$2_ : 0;
		this.align = align_ !== undefined ? align_ : 0;
		this.fieldAlign = fieldAlign_ !== undefined ? fieldAlign_ : 0;
		this.kind = kind_ !== undefined ? kind_ : 0;
		this.alg = alg_ !== undefined ? alg_ : ($ptrType($Uintptr)).nil;
		this.gc = gc_ !== undefined ? gc_ : 0;
		this.string = string_ !== undefined ? string_ : ($ptrType($String)).nil;
		this.uncommonType = uncommonType_ !== undefined ? uncommonType_ : ($ptrType(uncommonType)).nil;
		this.ptrToThis = ptrToThis_ !== undefined ? ptrToThis_ : ($ptrType(rtype)).nil;
	});
	method = $pkg.method = $newType(0, "Struct", "reflect.method", "method", "reflect", function(name_, pkgPath_, mtyp_, typ_, ifn_, tfn_) {
		this.$val = this;
		this.name = name_ !== undefined ? name_ : ($ptrType($String)).nil;
		this.pkgPath = pkgPath_ !== undefined ? pkgPath_ : ($ptrType($String)).nil;
		this.mtyp = mtyp_ !== undefined ? mtyp_ : ($ptrType(rtype)).nil;
		this.typ = typ_ !== undefined ? typ_ : ($ptrType(rtype)).nil;
		this.ifn = ifn_ !== undefined ? ifn_ : 0;
		this.tfn = tfn_ !== undefined ? tfn_ : 0;
	});
	uncommonType = $pkg.uncommonType = $newType(0, "Struct", "reflect.uncommonType", "uncommonType", "reflect", function(name_, pkgPath_, methods_) {
		this.$val = this;
		this.name = name_ !== undefined ? name_ : ($ptrType($String)).nil;
		this.pkgPath = pkgPath_ !== undefined ? pkgPath_ : ($ptrType($String)).nil;
		this.methods = methods_ !== undefined ? methods_ : ($sliceType(method)).nil;
	});
	ChanDir = $pkg.ChanDir = $newType(4, "Int", "reflect.ChanDir", "ChanDir", "reflect", null);
	arrayType = $pkg.arrayType = $newType(0, "Struct", "reflect.arrayType", "arrayType", "reflect", function(rtype_, elem_, slice_, len_) {
		this.$val = this;
		this.rtype = rtype_ !== undefined ? rtype_ : new rtype.Ptr();
		this.elem = elem_ !== undefined ? elem_ : ($ptrType(rtype)).nil;
		this.slice = slice_ !== undefined ? slice_ : ($ptrType(rtype)).nil;
		this.len = len_ !== undefined ? len_ : 0;
	});
	chanType = $pkg.chanType = $newType(0, "Struct", "reflect.chanType", "chanType", "reflect", function(rtype_, elem_, dir_) {
		this.$val = this;
		this.rtype = rtype_ !== undefined ? rtype_ : new rtype.Ptr();
		this.elem = elem_ !== undefined ? elem_ : ($ptrType(rtype)).nil;
		this.dir = dir_ !== undefined ? dir_ : 0;
	});
	funcType = $pkg.funcType = $newType(0, "Struct", "reflect.funcType", "funcType", "reflect", function(rtype_, dotdotdot_, in$2_, out_) {
		this.$val = this;
		this.rtype = rtype_ !== undefined ? rtype_ : new rtype.Ptr();
		this.dotdotdot = dotdotdot_ !== undefined ? dotdotdot_ : false;
		this.in$2 = in$2_ !== undefined ? in$2_ : ($sliceType(($ptrType(rtype)))).nil;
		this.out = out_ !== undefined ? out_ : ($sliceType(($ptrType(rtype)))).nil;
	});
	imethod = $pkg.imethod = $newType(0, "Struct", "reflect.imethod", "imethod", "reflect", function(name_, pkgPath_, typ_) {
		this.$val = this;
		this.name = name_ !== undefined ? name_ : ($ptrType($String)).nil;
		this.pkgPath = pkgPath_ !== undefined ? pkgPath_ : ($ptrType($String)).nil;
		this.typ = typ_ !== undefined ? typ_ : ($ptrType(rtype)).nil;
	});
	interfaceType = $pkg.interfaceType = $newType(0, "Struct", "reflect.interfaceType", "interfaceType", "reflect", function(rtype_, methods_) {
		this.$val = this;
		this.rtype = rtype_ !== undefined ? rtype_ : new rtype.Ptr();
		this.methods = methods_ !== undefined ? methods_ : ($sliceType(imethod)).nil;
	});
	mapType = $pkg.mapType = $newType(0, "Struct", "reflect.mapType", "mapType", "reflect", function(rtype_, key_, elem_, bucket_, hmap_) {
		this.$val = this;
		this.rtype = rtype_ !== undefined ? rtype_ : new rtype.Ptr();
		this.key = key_ !== undefined ? key_ : ($ptrType(rtype)).nil;
		this.elem = elem_ !== undefined ? elem_ : ($ptrType(rtype)).nil;
		this.bucket = bucket_ !== undefined ? bucket_ : ($ptrType(rtype)).nil;
		this.hmap = hmap_ !== undefined ? hmap_ : ($ptrType(rtype)).nil;
	});
	ptrType = $pkg.ptrType = $newType(0, "Struct", "reflect.ptrType", "ptrType", "reflect", function(rtype_, elem_) {
		this.$val = this;
		this.rtype = rtype_ !== undefined ? rtype_ : new rtype.Ptr();
		this.elem = elem_ !== undefined ? elem_ : ($ptrType(rtype)).nil;
	});
	sliceType = $pkg.sliceType = $newType(0, "Struct", "reflect.sliceType", "sliceType", "reflect", function(rtype_, elem_) {
		this.$val = this;
		this.rtype = rtype_ !== undefined ? rtype_ : new rtype.Ptr();
		this.elem = elem_ !== undefined ? elem_ : ($ptrType(rtype)).nil;
	});
	structField = $pkg.structField = $newType(0, "Struct", "reflect.structField", "structField", "reflect", function(name_, pkgPath_, typ_, tag_, offset_) {
		this.$val = this;
		this.name = name_ !== undefined ? name_ : ($ptrType($String)).nil;
		this.pkgPath = pkgPath_ !== undefined ? pkgPath_ : ($ptrType($String)).nil;
		this.typ = typ_ !== undefined ? typ_ : ($ptrType(rtype)).nil;
		this.tag = tag_ !== undefined ? tag_ : ($ptrType($String)).nil;
		this.offset = offset_ !== undefined ? offset_ : 0;
	});
	structType = $pkg.structType = $newType(0, "Struct", "reflect.structType", "structType", "reflect", function(rtype_, fields_) {
		this.$val = this;
		this.rtype = rtype_ !== undefined ? rtype_ : new rtype.Ptr();
		this.fields = fields_ !== undefined ? fields_ : ($sliceType(structField)).nil;
	});
	Method = $pkg.Method = $newType(0, "Struct", "reflect.Method", "Method", "reflect", function(Name_, PkgPath_, Type_, Func_, Index_) {
		this.$val = this;
		this.Name = Name_ !== undefined ? Name_ : "";
		this.PkgPath = PkgPath_ !== undefined ? PkgPath_ : "";
		this.Type = Type_ !== undefined ? Type_ : null;
		this.Func = Func_ !== undefined ? Func_ : new Value.Ptr();
		this.Index = Index_ !== undefined ? Index_ : 0;
	});
	StructField = $pkg.StructField = $newType(0, "Struct", "reflect.StructField", "StructField", "reflect", function(Name_, PkgPath_, Type_, Tag_, Offset_, Index_, Anonymous_) {
		this.$val = this;
		this.Name = Name_ !== undefined ? Name_ : "";
		this.PkgPath = PkgPath_ !== undefined ? PkgPath_ : "";
		this.Type = Type_ !== undefined ? Type_ : null;
		this.Tag = Tag_ !== undefined ? Tag_ : "";
		this.Offset = Offset_ !== undefined ? Offset_ : 0;
		this.Index = Index_ !== undefined ? Index_ : ($sliceType($Int)).nil;
		this.Anonymous = Anonymous_ !== undefined ? Anonymous_ : false;
	});
	StructTag = $pkg.StructTag = $newType(8, "String", "reflect.StructTag", "StructTag", "reflect", null);
	fieldScan = $pkg.fieldScan = $newType(0, "Struct", "reflect.fieldScan", "fieldScan", "reflect", function(typ_, index_) {
		this.$val = this;
		this.typ = typ_ !== undefined ? typ_ : ($ptrType(structType)).nil;
		this.index = index_ !== undefined ? index_ : ($sliceType($Int)).nil;
	});
	Value = $pkg.Value = $newType(0, "Struct", "reflect.Value", "Value", "reflect", function(typ_, val_, flag_) {
		this.$val = this;
		this.typ = typ_ !== undefined ? typ_ : ($ptrType(rtype)).nil;
		this.val = val_ !== undefined ? val_ : 0;
		this.flag = flag_ !== undefined ? flag_ : 0;
	});
	flag = $pkg.flag = $newType(4, "Uintptr", "reflect.flag", "flag", "reflect", null);
	ValueError = $pkg.ValueError = $newType(0, "Struct", "reflect.ValueError", "ValueError", "reflect", function(Method_, Kind_) {
		this.$val = this;
		this.Method = Method_ !== undefined ? Method_ : "";
		this.Kind = Kind_ !== undefined ? Kind_ : 0;
	});
	iword = $pkg.iword = $newType(4, "UnsafePointer", "reflect.iword", "iword", "reflect", null);
	jsType = function(typ) {
		return typ.jsType;
	};
	reflectType = function(typ) {
		var x;
		return (x = $internalize(typ.reflectType(), $emptyInterface), (x !== null && x.constructor === ($ptrType(rtype)) ? x.$val : $typeAssertionFailed(x, ($ptrType(rtype)))));
	};
	isWrapped = function(typ) {
		var _ref;
		_ref = typ.Kind();
		if (_ref === 1 || _ref === 2 || _ref === 3 || _ref === 4 || _ref === 5 || _ref === 7 || _ref === 8 || _ref === 9 || _ref === 10 || _ref === 12 || _ref === 13 || _ref === 14 || _ref === 17 || _ref === 21 || _ref === 19 || _ref === 24 || _ref === 25) {
			return true;
		} else if (_ref === 22) {
			return typ.Elem().Kind() === 17;
		}
		return false;
	};
	copyStruct = function(dst, src, typ) {
		var fields, i, name;
		fields = jsType(typ).fields;
		i = 0;
		while (i < $parseInt(fields.length)) {
			name = $internalize(fields[i][0], $String);
			dst[$externalize(name, $String)] = src[$externalize(name, $String)];
			i = i + 1 >> 0;
		}
	};
	zeroVal = function(typ) {
		var _ref, elemType;
		_ref = typ.Kind();
		if (_ref === 1) {
			return false;
		} else if (_ref === 2 || _ref === 3 || _ref === 4 || _ref === 5 || _ref === 7 || _ref === 8 || _ref === 9 || _ref === 10 || _ref === 12 || _ref === 13 || _ref === 14) {
			return 0;
		} else if (_ref === 6 || _ref === 11 || _ref === 15 || _ref === 16) {
			return new (jsType(typ))(0, 0);
		} else if (_ref === 17) {
			elemType = typ.Elem();
			return $makeNativeArray(jsType(elemType).kind, typ.Len(), $externalize((function() {
				return zeroVal(elemType);
			}), ($funcType([], [js.Object], false))));
		} else if (_ref === 19) {
			return $throwNilPointerError;
		} else if (_ref === 20) {
			return null;
		} else if (_ref === 21) {
			return false;
		} else if (_ref === 18 || _ref === 22 || _ref === 23) {
			return jsType(typ).nil;
		} else if (_ref === 24) {
			return "";
		} else if (_ref === 25) {
			return new (jsType(typ).Ptr)();
		} else {
			throw $panic(new ValueError.Ptr("reflect.Zero", typ.Kind()));
		}
	};
	makeIword = function(t, v) {
		if (t.Size() > 4 && !((t.Kind() === 17)) && !((t.Kind() === 25))) {
			return $newDataPointer(v, jsType(PtrTo(t)));
		}
		return v;
	};
	makeValue = function(t, v, fl) {
		var rt;
		rt = t.common();
		if (t.Size() > 4 && !((t.Kind() === 17)) && !((t.Kind() === 25))) {
			return new Value.Ptr(rt, $newDataPointer(v, jsType(rt.ptrTo())), (((fl | ((t.Kind() >>> 0) << 4 >>> 0)) >>> 0) | 2) >>> 0);
		}
		return new Value.Ptr(rt, v, (fl | ((t.Kind() >>> 0) << 4 >>> 0)) >>> 0);
	};
	MakeSlice = $pkg.MakeSlice = function(typ, len, cap) {
		var _struct;
		if (!((typ.Kind() === 23))) {
			throw $panic(new $String("reflect.MakeSlice of non-slice type"));
		}
		if (len < 0) {
			throw $panic(new $String("reflect.MakeSlice: negative len"));
		}
		if (cap < 0) {
			throw $panic(new $String("reflect.MakeSlice: negative cap"));
		}
		if (len > cap) {
			throw $panic(new $String("reflect.MakeSlice: len > cap"));
		}
		return (_struct = makeValue(typ, jsType(typ).make(len, cap, $externalize((function() {
			return zeroVal(typ.Elem());
		}), ($funcType([], [js.Object], false)))), 0), new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
	};
	jsObject = function() {
		return reflectType($packages[$externalize("github.com/gopherjs/gopherjs/js", $String)].Object);
	};
	TypeOf = $pkg.TypeOf = function(i) {
		var c;
		if (!initialized) {
			return new rtype.Ptr(0, 0, 0, 0, 0, 0, ($ptrType($Uintptr)).nil, 0, ($ptrType($String)).nil, ($ptrType(uncommonType)).nil, ($ptrType(rtype)).nil);
		}
		if ($interfaceIsEqual(i, null)) {
			return null;
		}
		c = i.constructor;
		if (c.kind === undefined) {
			return jsObject();
		}
		return reflectType(c);
	};
	ValueOf = $pkg.ValueOf = function(i) {
		var c, _struct;
		if ($interfaceIsEqual(i, null)) {
			return new Value.Ptr(($ptrType(rtype)).nil, 0, 0);
		}
		c = i.constructor;
		if (c.kind === undefined) {
			return new Value.Ptr(jsObject(), i, 320);
		}
		return (_struct = makeValue(reflectType(c), i.$val, 0), new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
	};
	rtype.Ptr.prototype.ptrTo = function() {
		var t;
		t = this;
		return reflectType($ptrType(jsType(t)));
	};
	rtype.prototype.ptrTo = function() { return this.$val.ptrTo(); };
	SliceOf = $pkg.SliceOf = function(t) {
		return reflectType($sliceType(jsType(t)));
	};
	Zero = $pkg.Zero = function(typ) {
		return new Value.Ptr(typ.common(), zeroVal(typ), (typ.Kind() >>> 0) << 4 >>> 0);
	};
	unsafe_New = function(typ) {
		var _ref;
		_ref = typ.Kind();
		if (_ref === 25) {
			return new (jsType(typ).Ptr)();
		} else if (_ref === 17) {
			return zeroVal(typ);
		} else {
			return $newDataPointer(zeroVal(typ), jsType(typ.ptrTo()));
		}
	};
	makeInt = function(f, bits, t) {
		var typ, ptr, w, _ref, v, v$1, v$2, v$3, v$4, v$5;
		typ = t.common();
		if (typ.size > 4) {
			ptr = unsafe_New(typ);
			ptr.$set(bits);
			return new Value.Ptr(typ, ptr, (((f | 2) >>> 0) | ((typ.Kind() >>> 0) << 4 >>> 0)) >>> 0);
		}
		w = 0;
		_ref = typ.Kind();
		if (_ref === 3) {
			new ($ptrType(iword))(function() { return w; }, function(v) { w = v;; }).$set((bits.low << 24 >> 24));
		} else if (_ref === 4) {
			new ($ptrType(iword))(function() { return w; }, function(v$1) { w = v$1;; }).$set((bits.low << 16 >> 16));
		} else if (_ref === 2 || _ref === 5) {
			new ($ptrType(iword))(function() { return w; }, function(v$2) { w = v$2;; }).$set((bits.low >> 0));
		} else if (_ref === 8) {
			new ($ptrType(iword))(function() { return w; }, function(v$3) { w = v$3;; }).$set((bits.low << 24 >>> 24));
		} else if (_ref === 9) {
			new ($ptrType(iword))(function() { return w; }, function(v$4) { w = v$4;; }).$set((bits.low << 16 >>> 16));
		} else if (_ref === 7 || _ref === 10 || _ref === 12) {
			new ($ptrType(iword))(function() { return w; }, function(v$5) { w = v$5;; }).$set((bits.low >>> 0));
		}
		return new Value.Ptr(typ, w, (f | ((typ.Kind() >>> 0) << 4 >>> 0)) >>> 0);
	};
	chanclose = function(ch) {
		$notSupported($externalize("channels", $String));
		throw $panic(new $String("unreachable"));
	};
	chanrecv = function(t, ch, nb) {
		var val, selected, received;
		val = 0;
		selected = false;
		received = false;
		$notSupported($externalize("channels", $String));
		throw $panic(new $String("unreachable"));
	};
	chansend = function(t, ch, val, nb) {
		$notSupported($externalize("channels", $String));
		throw $panic(new $String("unreachable"));
	};
	makemap = function(t) {
		var m;
		m = 0;
		m = new ($Map)();
		return m;
	};
	mapaccess = function(t, m, key) {
		var val, ok, k, entry, _tmp, _tmp$1, _tmp$2, _tmp$3;
		val = 0;
		ok = false;
		k = key;
		if (!(k.$key === undefined)) {
			k = k.$key();
		}
		entry = m[$externalize($internalize(k, $String), $String)];
		if (entry === undefined) {
			_tmp = 0; _tmp$1 = false; val = _tmp; ok = _tmp$1;
			return [val, ok];
		}
		_tmp$2 = makeIword(t.Elem(), entry.v); _tmp$3 = true; val = _tmp$2; ok = _tmp$3;
		return [val, ok];
	};
	mapassign = function(t, m, key, val, ok) {
		var k, jsVal, newVal, entry;
		k = key;
		if (!(k.$key === undefined)) {
			k = k.$key();
		}
		if (!ok) {
			delete m[$externalize($internalize(k, $String), $String)];
			return;
		}
		jsVal = val;
		if (t.Elem().Kind() === 25) {
			newVal = new ($global.Object)();
			copyStruct(newVal, jsVal, t.Elem());
			jsVal = newVal;
		}
		entry = new ($global.Object)();
		entry.k = $externalize(key, iword);
		entry.v = jsVal;
		m[$externalize($internalize(k, $String), $String)] = entry;
	};
	mapiterinit = function(t, m) {
		return new mapIter.Ptr(t, m, $keys($externalize(m, iword)), 0);
	};
	mapiterkey = function(it) {
		var key, ok, iter, k, _tmp, x, _tmp$1;
		key = 0;
		ok = false;
		iter = it;
		k = iter.keys[($parseInt(iter.i) >> 0)];
		_tmp = makeIword((x = $internalize(iter.t, $emptyInterface), (x !== null && x.constructor === ($ptrType(rtype)) ? x.$val : $typeAssertionFailed(x, ($ptrType(rtype))))).Key(), iter.m[$externalize($internalize(k, $String), $String)].k); _tmp$1 = true; key = _tmp; ok = _tmp$1;
		return [key, ok];
	};
	mapiternext = function(it) {
		var iter;
		iter = it;
		iter.i = ($parseInt(iter.i) >> 0) + 1 >> 0;
	};
	maplen = function(m) {
		return $parseInt($keys($externalize(m, iword)).length);
	};
	cvtDirect = function(v, typ) {
		var srcVal, _struct, val, k, _ref, slice;
		srcVal = v.iword();
		if (srcVal === jsType(v.typ).nil) {
			return (_struct = makeValue(typ, jsType(typ).nil, v.flag), new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
		}
		val = null;
		k = typ.Kind();
		_ref = k;
		switch (0) { default: if (_ref === 18) {
			val = new (jsType(typ))();
		} else if (_ref === 23) {
			slice = new (jsType(typ))(srcVal.array);
			slice.offset = srcVal.offset;
			slice.length = srcVal.length;
			slice.capacity = srcVal.capacity;
			val = $newDataPointer(slice, jsType(PtrTo(typ)));
		} else if (_ref === 22) {
			if (typ.Elem().Kind() === 25) {
				if ($interfaceIsEqual(typ.Elem(), v.typ.Elem())) {
					val = srcVal;
					break;
				}
				val = new (jsType(typ))();
				copyStruct(val, srcVal, typ.Elem());
				break;
			}
			val = new (jsType(typ))(srcVal.$get, srcVal.$set);
		} else if (_ref === 25) {
			val = new (jsType(typ).Ptr)();
			copyStruct(val, srcVal, typ);
		} else if (_ref === 17 || _ref === 19 || _ref === 20 || _ref === 21 || _ref === 24) {
			val = v.val;
		} else {
			throw $panic(new ValueError.Ptr("reflect.Convert", k));
		} }
		return new Value.Ptr(typ.common(), val, (((v.flag & 3) >>> 0) | ((typ.Kind() >>> 0) << 4 >>> 0)) >>> 0);
	};
	Copy = $pkg.Copy = function(dst, src) {
		var dk, sk, dstVal, srcVal;
		dk = (new flag(dst.flag)).kind();
		if (!((dk === 17)) && !((dk === 23))) {
			throw $panic(new ValueError.Ptr("reflect.Copy", dk));
		}
		if (dk === 17) {
			(new flag(dst.flag)).mustBeAssignable();
		}
		(new flag(dst.flag)).mustBeExported();
		sk = (new flag(src.flag)).kind();
		if (!((sk === 17)) && !((sk === 23))) {
			throw $panic(new ValueError.Ptr("reflect.Copy", sk));
		}
		(new flag(src.flag)).mustBeExported();
		typesMustMatch("reflect.Copy", dst.typ.Elem(), src.typ.Elem());
		dstVal = dst.iword();
		if (dk === 17) {
			dstVal = new (jsType(SliceOf(dst.typ.Elem())))(dstVal);
		}
		srcVal = src.iword();
		if (sk === 17) {
			srcVal = new (jsType(SliceOf(src.typ.Elem())))(srcVal);
		}
		return $parseInt($copySlice(dstVal, srcVal)) >> 0;
	};
	methodReceiver = function(op, v, i) {
		var t, name, tt, x, m, ut, x$1, m$1, rcvr;
		t = ($ptrType(rtype)).nil;
		name = "";
		if (v.typ.Kind() === 20) {
			tt = v.typ.interfaceType;
			if (i < 0 || i >= tt.methods.length) {
				throw $panic(new $String("reflect: internal error: invalid method index"));
			}
			if (v.IsNil()) {
				throw $panic(new $String("reflect: " + op + " of method on nil interface value"));
			}
			m = (x = tt.methods, ((i < 0 || i >= x.length) ? $throwRuntimeError("index out of range") : x.array[x.offset + i]));
			if (!($pointerIsEqual(m.pkgPath, ($ptrType($String)).nil))) {
				throw $panic(new $String("reflect: " + op + " of unexported method"));
			}
			t = m.typ;
			name = m.name.$get();
		} else {
			ut = v.typ.uncommonType.uncommon();
			if (ut === ($ptrType(uncommonType)).nil || i < 0 || i >= ut.methods.length) {
				throw $panic(new $String("reflect: internal error: invalid method index"));
			}
			m$1 = (x$1 = ut.methods, ((i < 0 || i >= x$1.length) ? $throwRuntimeError("index out of range") : x$1.array[x$1.offset + i]));
			if (!($pointerIsEqual(m$1.pkgPath, ($ptrType($String)).nil))) {
				throw $panic(new $String("reflect: " + op + " of unexported method"));
			}
			t = m$1.mtyp;
			name = $internalize(jsType(v.typ).methods[i][0], $String);
		}
		rcvr = v.iword();
		if (isWrapped(v.typ)) {
			rcvr = new (jsType(v.typ))(rcvr);
		}
		return [t, rcvr[$externalize(name, $String)], rcvr];
	};
	valueInterface = function(v, safe) {
		var _struct, _struct$1;
		if (v.flag === 0) {
			throw $panic(new ValueError.Ptr("reflect.Value.Interface", 0));
		}
		if (safe && !((((v.flag & 1) >>> 0) === 0))) {
			throw $panic(new $String("reflect.Value.Interface: cannot return value obtained from unexported field or method"));
		}
		if (!((((v.flag & 8) >>> 0) === 0))) {
			v = (_struct$1 = makeMethodValue("Interface", (_struct = v, new Value.Ptr(_struct.typ, _struct.val, _struct.flag))), new Value.Ptr(_struct$1.typ, _struct$1.val, _struct$1.flag));
		}
		if (isWrapped(v.typ)) {
			return new (jsType(v.typ))(v.iword());
		}
		return v.iword();
	};
	ifaceE2I = function(t, src, dst) {
		dst.$set(src);
	};
	methodName = function() {
		return "?FIXME?";
	};
	makeMethodValue = function(op, v) {
		var _tuple, _struct, fn, rcvr, fv;
		if (((v.flag & 8) >>> 0) === 0) {
			throw $panic(new $String("reflect: internal error: invalid use of makePartialFunc"));
		}
		_tuple = methodReceiver(op, (_struct = v, new Value.Ptr(_struct.typ, _struct.val, _struct.flag)), (v.flag >> 0) >> 9 >> 0); fn = _tuple[1]; rcvr = _tuple[2];
		fv = (function() {
			return fn.apply($externalize(rcvr, iword), $externalize(new ($sliceType(js.Object))($global.Array.prototype.slice.call(arguments)), ($sliceType(js.Object))));
		});
		return new Value.Ptr(v.Type().common(), fv, (((v.flag & 1) >>> 0) | 304) >>> 0);
	};
	uncommonType.Ptr.prototype.Method = function(i) {
		var m, t, x, p, fl, mt, name, fn, _struct, _struct$1;
		m = new Method.Ptr();
		t = this;
		if (t === ($ptrType(uncommonType)).nil || i < 0 || i >= t.methods.length) {
			throw $panic(new $String("reflect: Method index out of range"));
		}
		p = (x = t.methods, ((i < 0 || i >= x.length) ? $throwRuntimeError("index out of range") : x.array[x.offset + i]));
		if (!($pointerIsEqual(p.name, ($ptrType($String)).nil))) {
			m.Name = p.name.$get();
		}
		fl = 304;
		if (!($pointerIsEqual(p.pkgPath, ($ptrType($String)).nil))) {
			m.PkgPath = p.pkgPath.$get();
			fl = (fl | 1) >>> 0;
		}
		mt = p.typ;
		m.Type = mt;
		name = $internalize(t.jsType.methods[i][0], $String);
		fn = (function(rcvr) {
			return rcvr[$externalize(name, $String)].apply(rcvr, $externalize($subslice(new ($sliceType(js.Object))($global.Array.prototype.slice.call(arguments)), 1), ($sliceType(js.Object))));
		});
		m.Func = new Value.Ptr(mt, fn, fl);
		m.Index = i;
		return (_struct = m, new Method.Ptr(_struct.Name, _struct.PkgPath, _struct.Type, (_struct$1 = _struct.Func, new Value.Ptr(_struct$1.typ, _struct$1.val, _struct$1.flag)), _struct.Index));
	};
	uncommonType.prototype.Method = function(i) { return this.$val.Method(i); };
	Value.Ptr.prototype.iword = function() {
		var _struct, v, val, _ref, newVal;
		v = (_struct = this, new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
		if (!((((v.flag & 2) >>> 0) === 0)) && !((v.typ.Kind() === 17)) && !((v.typ.Kind() === 25))) {
			val = v.val.$get();
			if (!(val === null) && !(val.constructor === jsType(v.typ))) {
				_ref = v.typ.Kind();
				switch (0) { default: if (_ref === 11 || _ref === 6) {
					val = new (jsType(v.typ))(val.high, val.low);
				} else if (_ref === 15 || _ref === 16) {
					val = new (jsType(v.typ))(val.real, val.imag);
				} else if (_ref === 23) {
					if (val === val.constructor.nil) {
						val = jsType(v.typ).nil;
						break;
					}
					newVal = new (jsType(v.typ))(val.array);
					newVal.offset = val.offset;
					newVal.length = val.length;
					newVal.capacity = val.capacity;
					val = newVal;
				} }
			}
			return val;
		}
		return v.val;
	};
	Value.prototype.iword = function() { return this.$val.iword(); };
	Value.Ptr.prototype.call = function(op, in$1) {
		var _struct, v, t, fn, rcvr, _tuple, _struct$1, isSlice, n, _ref, _i, _struct$2, x, i, _tmp, _tmp$1, xt, targ, m, _struct$3, slice, elem, i$1, x$1, _struct$4, x$2, xt$1, _struct$5, origIn, _struct$6, nin, nout, argsArray, _ref$1, _i$1, _struct$7, arg, i$2, results, _ref$2, _struct$8, ret, _ref$3, _i$2, i$3, _struct$9;
		v = (_struct = this, new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
		t = v.typ;
		fn = 0;
		rcvr = 0;
		if (!((((v.flag & 8) >>> 0) === 0))) {
			_tuple = methodReceiver(op, (_struct$1 = v, new Value.Ptr(_struct$1.typ, _struct$1.val, _struct$1.flag)), (v.flag >> 0) >> 9 >> 0); t = _tuple[0]; fn = _tuple[1]; rcvr = _tuple[2];
		} else {
			fn = v.iword();
		}
		if (fn === 0) {
			throw $panic(new $String("reflect.Value.Call: call of nil function"));
		}
		isSlice = op === "CallSlice";
		n = t.NumIn();
		if (isSlice) {
			if (!t.IsVariadic()) {
				throw $panic(new $String("reflect: CallSlice of non-variadic function"));
			}
			if (in$1.length < n) {
				throw $panic(new $String("reflect: CallSlice with too few input arguments"));
			}
			if (in$1.length > n) {
				throw $panic(new $String("reflect: CallSlice with too many input arguments"));
			}
		} else {
			if (t.IsVariadic()) {
				n = n - 1 >> 0;
			}
			if (in$1.length < n) {
				throw $panic(new $String("reflect: Call with too few input arguments"));
			}
			if (!t.IsVariadic() && in$1.length > n) {
				throw $panic(new $String("reflect: Call with too many input arguments"));
			}
		}
		_ref = in$1;
		_i = 0;
		while (_i < _ref.length) {
			x = (_struct$2 = ((_i < 0 || _i >= _ref.length) ? $throwRuntimeError("index out of range") : _ref.array[_ref.offset + _i]), new Value.Ptr(_struct$2.typ, _struct$2.val, _struct$2.flag));
			if (x.Kind() === 0) {
				throw $panic(new $String("reflect: " + op + " using zero Value argument"));
			}
			_i++;
		}
		i = 0;
		while (i < n) {
			_tmp = ((i < 0 || i >= in$1.length) ? $throwRuntimeError("index out of range") : in$1.array[in$1.offset + i]).Type(); _tmp$1 = t.In(i); xt = _tmp; targ = _tmp$1;
			if (!xt.AssignableTo(targ)) {
				throw $panic(new $String("reflect: " + op + " using " + xt.String() + " as type " + targ.String()));
			}
			i = i + 1 >> 0;
		}
		if (!isSlice && t.IsVariadic()) {
			m = in$1.length - n >> 0;
			slice = (_struct$3 = MakeSlice(t.In(n), m, m), new Value.Ptr(_struct$3.typ, _struct$3.val, _struct$3.flag));
			elem = t.In(n).Elem();
			i$1 = 0;
			while (i$1 < m) {
				x$2 = (_struct$4 = (x$1 = n + i$1 >> 0, ((x$1 < 0 || x$1 >= in$1.length) ? $throwRuntimeError("index out of range") : in$1.array[in$1.offset + x$1])), new Value.Ptr(_struct$4.typ, _struct$4.val, _struct$4.flag));
				xt$1 = x$2.Type();
				if (!xt$1.AssignableTo(elem)) {
					throw $panic(new $String("reflect: cannot use " + xt$1.String() + " as type " + elem.String() + " in " + op));
				}
				slice.Index(i$1).Set((_struct$5 = x$2, new Value.Ptr(_struct$5.typ, _struct$5.val, _struct$5.flag)));
				i$1 = i$1 + 1 >> 0;
			}
			origIn = in$1;
			in$1 = ($sliceType(Value)).make((n + 1 >> 0), 0, function() { return new Value.Ptr(); });
			$copySlice($subslice(in$1, 0, n), origIn);
			(n < 0 || n >= in$1.length) ? $throwRuntimeError("index out of range") : in$1.array[in$1.offset + n] = (_struct$6 = slice, new Value.Ptr(_struct$6.typ, _struct$6.val, _struct$6.flag));
		}
		nin = in$1.length;
		if (!((nin === t.NumIn()))) {
			throw $panic(new $String("reflect.Value.Call: wrong argument count"));
		}
		nout = t.NumOut();
		argsArray = new ($global.Array)(t.NumIn());
		_ref$1 = in$1;
		_i$1 = 0;
		while (_i$1 < _ref$1.length) {
			arg = (_struct$7 = ((_i$1 < 0 || _i$1 >= _ref$1.length) ? $throwRuntimeError("index out of range") : _ref$1.array[_ref$1.offset + _i$1]), new Value.Ptr(_struct$7.typ, _struct$7.val, _struct$7.flag));
			i$2 = _i$1;
			argsArray[i$2] = $externalize(arg.assignTo("reflect.Value.Call", t.In(i$2).common(), ($ptrType($emptyInterface)).nil).iword(), iword);
			_i$1++;
		}
		results = fn.apply($externalize(rcvr, iword), argsArray);
		_ref$2 = nout;
		if (_ref$2 === 0) {
			return ($sliceType(Value)).nil;
		} else if (_ref$2 === 1) {
			return new ($sliceType(Value))([(_struct$8 = makeValue(t.Out(0), results, 0), new Value.Ptr(_struct$8.typ, _struct$8.val, _struct$8.flag))]);
		} else {
			ret = ($sliceType(Value)).make(nout, 0, function() { return new Value.Ptr(); });
			_ref$3 = ret;
			_i$2 = 0;
			while (_i$2 < _ref$3.length) {
				i$3 = _i$2;
				(i$3 < 0 || i$3 >= ret.length) ? $throwRuntimeError("index out of range") : ret.array[ret.offset + i$3] = (_struct$9 = makeValue(t.Out(i$3), results[i$3], 0), new Value.Ptr(_struct$9.typ, _struct$9.val, _struct$9.flag));
				_i$2++;
			}
			return ret;
		}
	};
	Value.prototype.call = function(op, in$1) { return this.$val.call(op, in$1); };
	Value.Ptr.prototype.Cap = function() {
		var _struct, v, k, _ref;
		v = (_struct = this, new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
		k = (new flag(v.flag)).kind();
		_ref = k;
		if (_ref === 17) {
			return v.typ.Len();
		} else if (_ref === 23) {
			return $parseInt(v.iword().capacity) >> 0;
		}
		throw $panic(new ValueError.Ptr("reflect.Value.Cap", k));
	};
	Value.prototype.Cap = function() { return this.$val.Cap(); };
	Value.Ptr.prototype.Elem = function() {
		var _struct, v, k, _ref, val, typ, _struct$1, val$1, tt, fl;
		v = (_struct = this, new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
		k = (new flag(v.flag)).kind();
		_ref = k;
		if (_ref === 20) {
			val = v.iword();
			if (val === null) {
				return new Value.Ptr(($ptrType(rtype)).nil, 0, 0);
			}
			typ = reflectType(val.constructor);
			return (_struct$1 = makeValue(typ, val.$val, (v.flag & 1) >>> 0), new Value.Ptr(_struct$1.typ, _struct$1.val, _struct$1.flag));
		} else if (_ref === 22) {
			if (v.IsNil()) {
				return new Value.Ptr(($ptrType(rtype)).nil, 0, 0);
			}
			val$1 = v.iword();
			tt = v.typ.ptrType;
			fl = (((((v.flag & 1) >>> 0) | 2) >>> 0) | 4) >>> 0;
			fl = (fl | (((tt.elem.Kind() >>> 0) << 4 >>> 0))) >>> 0;
			return new Value.Ptr(tt.elem, val$1, fl);
		} else {
			throw $panic(new ValueError.Ptr("reflect.Value.Elem", k));
		}
	};
	Value.prototype.Elem = function() { return this.$val.Elem(); };
	Value.Ptr.prototype.Field = function(i) {
		var _struct, v, tt, x, field, name, typ, fl, s, _struct$1;
		v = (_struct = this, new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
		(new flag(v.flag)).mustBe(25);
		tt = v.typ.structType;
		if (i < 0 || i >= tt.fields.length) {
			throw $panic(new $String("reflect: Field index out of range"));
		}
		field = (x = tt.fields, ((i < 0 || i >= x.length) ? $throwRuntimeError("index out of range") : x.array[x.offset + i]));
		name = $internalize(jsType(v.typ).fields[i][0], $String);
		typ = field.typ;
		fl = (v.flag & 7) >>> 0;
		if (!($pointerIsEqual(field.pkgPath, ($ptrType($String)).nil))) {
			fl = (fl | 1) >>> 0;
		}
		fl = (fl | (((typ.Kind() >>> 0) << 4 >>> 0))) >>> 0;
		s = v.val;
		if (!((((fl & 2) >>> 0) === 0)) && !((typ.Kind() === 17)) && !((typ.Kind() === 25))) {
			return new Value.Ptr(typ, new (jsType(PtrTo(typ)))($externalize((function() {
				return s[$externalize(name, $String)];
			}), ($funcType([], [js.Object], false))), $externalize((function(v$1) {
				s[$externalize(name, $String)] = v$1;
			}), ($funcType([js.Object], [], false)))), fl);
		}
		return (_struct$1 = makeValue(typ, s[$externalize(name, $String)], fl), new Value.Ptr(_struct$1.typ, _struct$1.val, _struct$1.flag));
	};
	Value.prototype.Field = function(i) { return this.$val.Field(i); };
	Value.Ptr.prototype.Index = function(i) {
		var _struct, v, k, _ref, tt, typ, fl, a, _struct$1, s, tt$1, typ$1, fl$1, a$1, _struct$2, str, fl$2;
		v = (_struct = this, new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
		k = (new flag(v.flag)).kind();
		_ref = k;
		if (_ref === 17) {
			tt = v.typ.arrayType;
			if (i < 0 || i > (tt.len >> 0)) {
				throw $panic(new $String("reflect: array index out of range"));
			}
			typ = tt.elem;
			fl = (v.flag & 7) >>> 0;
			fl = (fl | (((typ.Kind() >>> 0) << 4 >>> 0))) >>> 0;
			a = v.val;
			if (!((((fl & 2) >>> 0) === 0)) && !((typ.Kind() === 17)) && !((typ.Kind() === 25))) {
				return new Value.Ptr(typ, new (jsType(PtrTo(typ)))($externalize((function() {
					return a[i];
				}), ($funcType([], [js.Object], false))), $externalize((function(v$1) {
					a[i] = v$1;
				}), ($funcType([js.Object], [], false)))), fl);
			}
			return (_struct$1 = makeValue(typ, a[i], fl), new Value.Ptr(_struct$1.typ, _struct$1.val, _struct$1.flag));
		} else if (_ref === 23) {
			s = v.iword();
			if (i < 0 || i >= $parseInt(s.length)) {
				throw $panic(new $String("reflect: slice index out of range"));
			}
			tt$1 = v.typ.sliceType;
			typ$1 = tt$1.elem;
			fl$1 = (6 | ((v.flag & 1) >>> 0)) >>> 0;
			fl$1 = (fl$1 | (((typ$1.Kind() >>> 0) << 4 >>> 0))) >>> 0;
			i = i + (($parseInt(s.offset) >> 0)) >> 0;
			a$1 = s.array;
			if (!((((fl$1 & 2) >>> 0) === 0)) && !((typ$1.Kind() === 17)) && !((typ$1.Kind() === 25))) {
				return new Value.Ptr(typ$1, new (jsType(PtrTo(typ$1)))($externalize((function() {
					return a$1[i];
				}), ($funcType([], [js.Object], false))), $externalize((function(v$1) {
					a$1[i] = v$1;
				}), ($funcType([js.Object], [], false)))), fl$1);
			}
			return (_struct$2 = makeValue(typ$1, a$1[i], fl$1), new Value.Ptr(_struct$2.typ, _struct$2.val, _struct$2.flag));
		} else if (_ref === 24) {
			str = v.val.$get();
			if (i < 0 || i >= str.length) {
				throw $panic(new $String("reflect: string index out of range"));
			}
			fl$2 = (((v.flag & 1) >>> 0) | 128) >>> 0;
			return new Value.Ptr(uint8Type, (str.charCodeAt(i) >>> 0), fl$2);
		} else {
			throw $panic(new ValueError.Ptr("reflect.Value.Index", k));
		}
	};
	Value.prototype.Index = function(i) { return this.$val.Index(i); };
	Value.Ptr.prototype.IsNil = function() {
		var _struct, v, k, _ref;
		v = (_struct = this, new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
		k = (new flag(v.flag)).kind();
		_ref = k;
		if (_ref === 18 || _ref === 22 || _ref === 23) {
			return v.iword() === jsType(v.typ).nil;
		} else if (_ref === 19) {
			return v.iword() === $throwNilPointerError;
		} else if (_ref === 21) {
			return v.iword() === false;
		} else if (_ref === 20) {
			return v.iword() === null;
		} else {
			throw $panic(new ValueError.Ptr("reflect.Value.IsNil", k));
		}
	};
	Value.prototype.IsNil = function() { return this.$val.IsNil(); };
	Value.Ptr.prototype.Len = function() {
		var _struct, v, k, _ref;
		v = (_struct = this, new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
		k = (new flag(v.flag)).kind();
		_ref = k;
		if (_ref === 17 || _ref === 23 || _ref === 24) {
			return $parseInt(v.iword().length);
		} else if (_ref === 21) {
			return $parseInt($keys($externalize(v.iword(), iword)).length);
		} else {
			throw $panic(new ValueError.Ptr("reflect.Value.Len", k));
		}
	};
	Value.prototype.Len = function() { return this.$val.Len(); };
	Value.Ptr.prototype.Pointer = function() {
		var _struct, v, k, _ref;
		v = (_struct = this, new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
		k = (new flag(v.flag)).kind();
		_ref = k;
		if (_ref === 18 || _ref === 21 || _ref === 22 || _ref === 23 || _ref === 26) {
			if (v.IsNil()) {
				return 0;
			}
			return v.iword();
		} else if (_ref === 19) {
			if (v.IsNil()) {
				return 0;
			}
			return 1;
		} else {
			throw $panic(new ValueError.Ptr("reflect.Value.Pointer", k));
		}
	};
	Value.prototype.Pointer = function() { return this.$val.Pointer(); };
	Value.Ptr.prototype.Set = function(x) {
		var _struct, v, _ref, _struct$1;
		v = (_struct = this, new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
		(new flag(v.flag)).mustBeAssignable();
		(new flag(x.flag)).mustBeExported();
		if (!((((v.flag & 2) >>> 0) === 0))) {
			_ref = v.typ.Kind();
			if (_ref === 17) {
				$copyArray($externalize(v.val, $UnsafePointer), $externalize(x.val, $UnsafePointer));
			} else if (_ref === 20) {
				v.val.$set(valueInterface((_struct$1 = x, new Value.Ptr(_struct$1.typ, _struct$1.val, _struct$1.flag)), false));
			} else if (_ref === 25) {
				copyStruct(v.val, x.val, v.typ);
			} else {
				v.val.$set($externalize(x.iword(), iword));
			}
			return;
		}
		v.val = x.val;
	};
	Value.prototype.Set = function(x) { return this.$val.Set(x); };
	Value.Ptr.prototype.SetCap = function(n) {
		var _struct, v, s, newSlice;
		v = (_struct = this, new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
		(new flag(v.flag)).mustBeAssignable();
		(new flag(v.flag)).mustBe(23);
		s = v.val.$get();
		if (n < $parseInt(s.length) || n > ($parseInt(s.capacity) >> 0)) {
			throw $panic(new $String("reflect: slice capacity out of range in SetCap"));
		}
		newSlice = new (jsType(v.typ))(s.array);
		newSlice.offset = s.offset;
		newSlice.length = s.length;
		newSlice.capacity = n;
		v.val.$set(newSlice);
	};
	Value.prototype.SetCap = function(n) { return this.$val.SetCap(n); };
	Value.Ptr.prototype.SetLen = function(n) {
		var _struct, v, s, newSlice;
		v = (_struct = this, new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
		(new flag(v.flag)).mustBeAssignable();
		(new flag(v.flag)).mustBe(23);
		s = v.val.$get();
		if (n < 0 || n > ($parseInt(s.capacity) >> 0)) {
			throw $panic(new $String("reflect: slice length out of range in SetLen"));
		}
		newSlice = new (jsType(v.typ))(s.array);
		newSlice.offset = s.offset;
		newSlice.length = n;
		newSlice.capacity = s.capacity;
		v.val.$set(newSlice);
	};
	Value.prototype.SetLen = function(n) { return this.$val.SetLen(n); };
	Value.Ptr.prototype.Slice = function(i, j) {
		var _struct, v, cap, typ, s, kind, _ref, tt, str, _struct$1, _struct$2;
		v = (_struct = this, new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
		cap = 0;
		typ = null;
		s = null;
		kind = (new flag(v.flag)).kind();
		_ref = kind;
		if (_ref === 17) {
			if (((v.flag & 4) >>> 0) === 0) {
				throw $panic(new $String("reflect.Value.Slice: slice of unaddressable array"));
			}
			tt = v.typ.arrayType;
			cap = (tt.len >> 0);
			typ = SliceOf(tt.elem);
			s = new (jsType(typ))($externalize(v.iword(), iword));
		} else if (_ref === 23) {
			typ = v.typ;
			s = v.iword();
			cap = $parseInt(s.capacity) >> 0;
		} else if (_ref === 24) {
			str = v.val.$get();
			if (i < 0 || j < i || j > str.length) {
				throw $panic(new $String("reflect.Value.Slice: string slice index out of bounds"));
			}
			return (_struct$1 = ValueOf(new $String(str.substring(i, j))), new Value.Ptr(_struct$1.typ, _struct$1.val, _struct$1.flag));
		} else {
			throw $panic(new ValueError.Ptr("reflect.Value.Slice", kind));
		}
		if (i < 0 || j < i || j > cap) {
			throw $panic(new $String("reflect.Value.Slice: slice index out of bounds"));
		}
		return (_struct$2 = makeValue(typ, $subslice(s, i, j), (v.flag & 1) >>> 0), new Value.Ptr(_struct$2.typ, _struct$2.val, _struct$2.flag));
	};
	Value.prototype.Slice = function(i, j) { return this.$val.Slice(i, j); };
	Value.Ptr.prototype.Slice3 = function(i, j, k) {
		var _struct, v, cap, typ, s, kind, _ref, tt, _struct$1;
		v = (_struct = this, new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
		cap = 0;
		typ = null;
		s = null;
		kind = (new flag(v.flag)).kind();
		_ref = kind;
		if (_ref === 17) {
			if (((v.flag & 4) >>> 0) === 0) {
				throw $panic(new $String("reflect.Value.Slice: slice of unaddressable array"));
			}
			tt = v.typ.arrayType;
			cap = (tt.len >> 0);
			typ = SliceOf(tt.elem);
			s = new (jsType(typ))($externalize(v.iword(), iword));
		} else if (_ref === 23) {
			typ = v.typ;
			s = v.iword();
			cap = $parseInt(s.capacity) >> 0;
		} else {
			throw $panic(new ValueError.Ptr("reflect.Value.Slice3", kind));
		}
		if (i < 0 || j < i || k < j || k > cap) {
			throw $panic(new $String("reflect.Value.Slice3: slice index out of bounds"));
		}
		return (_struct$1 = makeValue(typ, $subslice(s, i, j, k), (v.flag & 1) >>> 0), new Value.Ptr(_struct$1.typ, _struct$1.val, _struct$1.flag));
	};
	Value.prototype.Slice3 = function(i, j, k) { return this.$val.Slice3(i, j, k); };
	Kind.prototype.String = function() {
		var k;
		k = this.$val;
		if ((k >> 0) < kindNames.length) {
			return ((k < 0 || k >= kindNames.length) ? $throwRuntimeError("index out of range") : kindNames.array[kindNames.offset + k]);
		}
		return "kind" + strconv.Itoa((k >> 0));
	};
	$ptrType(Kind).prototype.String = function() { return new Kind(this.$get()).String(); };
	uncommonType.Ptr.prototype.uncommon = function() {
		var t;
		t = this;
		return t;
	};
	uncommonType.prototype.uncommon = function() { return this.$val.uncommon(); };
	uncommonType.Ptr.prototype.PkgPath = function() {
		var t;
		t = this;
		if (t === ($ptrType(uncommonType)).nil || $pointerIsEqual(t.pkgPath, ($ptrType($String)).nil)) {
			return "";
		}
		return t.pkgPath.$get();
	};
	uncommonType.prototype.PkgPath = function() { return this.$val.PkgPath(); };
	uncommonType.Ptr.prototype.Name = function() {
		var t;
		t = this;
		if (t === ($ptrType(uncommonType)).nil || $pointerIsEqual(t.name, ($ptrType($String)).nil)) {
			return "";
		}
		return t.name.$get();
	};
	uncommonType.prototype.Name = function() { return this.$val.Name(); };
	rtype.Ptr.prototype.String = function() {
		var t;
		t = this;
		return t.string.$get();
	};
	rtype.prototype.String = function() { return this.$val.String(); };
	rtype.Ptr.prototype.Size = function() {
		var t;
		t = this;
		return t.size;
	};
	rtype.prototype.Size = function() { return this.$val.Size(); };
	rtype.Ptr.prototype.Bits = function() {
		var t, k, x;
		t = this;
		if (t === ($ptrType(rtype)).nil) {
			throw $panic(new $String("reflect: Bits of nil Type"));
		}
		k = t.Kind();
		if (k < 2 || k > 16) {
			throw $panic(new $String("reflect: Bits of non-arithmetic Type " + t.String()));
		}
		return (x = (t.size >> 0), (((x >>> 16 << 16) * 8 >> 0) + (x << 16 >>> 16) * 8) >> 0);
	};
	rtype.prototype.Bits = function() { return this.$val.Bits(); };
	rtype.Ptr.prototype.Align = function() {
		var t;
		t = this;
		return (t.align >> 0);
	};
	rtype.prototype.Align = function() { return this.$val.Align(); };
	rtype.Ptr.prototype.FieldAlign = function() {
		var t;
		t = this;
		return (t.fieldAlign >> 0);
	};
	rtype.prototype.FieldAlign = function() { return this.$val.FieldAlign(); };
	rtype.Ptr.prototype.Kind = function() {
		var t;
		t = this;
		return (((t.kind & 127) >>> 0) >>> 0);
	};
	rtype.prototype.Kind = function() { return this.$val.Kind(); };
	rtype.Ptr.prototype.common = function() {
		var t;
		t = this;
		return t;
	};
	rtype.prototype.common = function() { return this.$val.common(); };
	uncommonType.Ptr.prototype.NumMethod = function() {
		var t;
		t = this;
		if (t === ($ptrType(uncommonType)).nil) {
			return 0;
		}
		return t.methods.length;
	};
	uncommonType.prototype.NumMethod = function() { return this.$val.NumMethod(); };
	uncommonType.Ptr.prototype.MethodByName = function(name) {
		var m, ok, t, _struct, _struct$1, p, _ref, _i, i, x, _tmp, _struct$2, _struct$3, _tmp$1, _struct$4, _struct$5, _struct$6, _struct$7;
		m = new Method.Ptr();
		ok = false;
		t = this;
		if (t === ($ptrType(uncommonType)).nil) {
			return [(_struct = m, new Method.Ptr(_struct.Name, _struct.PkgPath, _struct.Type, (_struct$1 = _struct.Func, new Value.Ptr(_struct$1.typ, _struct$1.val, _struct$1.flag)), _struct.Index)), ok];
		}
		p = ($ptrType(method)).nil;
		_ref = t.methods;
		_i = 0;
		while (_i < _ref.length) {
			i = _i;
			p = (x = t.methods, ((i < 0 || i >= x.length) ? $throwRuntimeError("index out of range") : x.array[x.offset + i]));
			if (!($pointerIsEqual(p.name, ($ptrType($String)).nil)) && p.name.$get() === name) {
				_tmp = (_struct$2 = t.Method(i), new Method.Ptr(_struct$2.Name, _struct$2.PkgPath, _struct$2.Type, (_struct$3 = _struct$2.Func, new Value.Ptr(_struct$3.typ, _struct$3.val, _struct$3.flag)), _struct$2.Index)); _tmp$1 = true; m = _tmp; ok = _tmp$1;
				return [(_struct$4 = m, new Method.Ptr(_struct$4.Name, _struct$4.PkgPath, _struct$4.Type, (_struct$5 = _struct$4.Func, new Value.Ptr(_struct$5.typ, _struct$5.val, _struct$5.flag)), _struct$4.Index)), ok];
			}
			_i++;
		}
		return [(_struct$6 = m, new Method.Ptr(_struct$6.Name, _struct$6.PkgPath, _struct$6.Type, (_struct$7 = _struct$6.Func, new Value.Ptr(_struct$7.typ, _struct$7.val, _struct$7.flag)), _struct$6.Index)), ok];
	};
	uncommonType.prototype.MethodByName = function(name) { return this.$val.MethodByName(name); };
	rtype.Ptr.prototype.NumMethod = function() {
		var t, tt;
		t = this;
		if (t.Kind() === 20) {
			tt = t.interfaceType;
			return tt.NumMethod();
		}
		return t.uncommonType.NumMethod();
	};
	rtype.prototype.NumMethod = function() { return this.$val.NumMethod(); };
	rtype.Ptr.prototype.Method = function(i) {
		var m, t, tt, _struct, _struct$1, _struct$2, _struct$3, _struct$4, _struct$5, _struct$6, _struct$7;
		m = new Method.Ptr();
		t = this;
		if (t.Kind() === 20) {
			tt = t.interfaceType;
			m = (_struct = tt.Method(i), new Method.Ptr(_struct.Name, _struct.PkgPath, _struct.Type, (_struct$1 = _struct.Func, new Value.Ptr(_struct$1.typ, _struct$1.val, _struct$1.flag)), _struct.Index));
			return (_struct$2 = m, new Method.Ptr(_struct$2.Name, _struct$2.PkgPath, _struct$2.Type, (_struct$3 = _struct$2.Func, new Value.Ptr(_struct$3.typ, _struct$3.val, _struct$3.flag)), _struct$2.Index));
		}
		m = (_struct$4 = t.uncommonType.Method(i), new Method.Ptr(_struct$4.Name, _struct$4.PkgPath, _struct$4.Type, (_struct$5 = _struct$4.Func, new Value.Ptr(_struct$5.typ, _struct$5.val, _struct$5.flag)), _struct$4.Index));
		return (_struct$6 = m, new Method.Ptr(_struct$6.Name, _struct$6.PkgPath, _struct$6.Type, (_struct$7 = _struct$6.Func, new Value.Ptr(_struct$7.typ, _struct$7.val, _struct$7.flag)), _struct$6.Index));
	};
	rtype.prototype.Method = function(i) { return this.$val.Method(i); };
	rtype.Ptr.prototype.MethodByName = function(name) {
		var m, ok, t, tt, _tuple, _struct, _struct$1, _struct$2, _struct$3, _tuple$1, _struct$4, _struct$5, _struct$6, _struct$7;
		m = new Method.Ptr();
		ok = false;
		t = this;
		if (t.Kind() === 20) {
			tt = t.interfaceType;
			_tuple = tt.MethodByName(name); m = (_struct = _tuple[0], new Method.Ptr(_struct.Name, _struct.PkgPath, _struct.Type, (_struct$1 = _struct.Func, new Value.Ptr(_struct$1.typ, _struct$1.val, _struct$1.flag)), _struct.Index)); ok = _tuple[1];
			return [(_struct$2 = m, new Method.Ptr(_struct$2.Name, _struct$2.PkgPath, _struct$2.Type, (_struct$3 = _struct$2.Func, new Value.Ptr(_struct$3.typ, _struct$3.val, _struct$3.flag)), _struct$2.Index)), ok];
		}
		_tuple$1 = t.uncommonType.MethodByName(name); m = (_struct$4 = _tuple$1[0], new Method.Ptr(_struct$4.Name, _struct$4.PkgPath, _struct$4.Type, (_struct$5 = _struct$4.Func, new Value.Ptr(_struct$5.typ, _struct$5.val, _struct$5.flag)), _struct$4.Index)); ok = _tuple$1[1];
		return [(_struct$6 = m, new Method.Ptr(_struct$6.Name, _struct$6.PkgPath, _struct$6.Type, (_struct$7 = _struct$6.Func, new Value.Ptr(_struct$7.typ, _struct$7.val, _struct$7.flag)), _struct$6.Index)), ok];
	};
	rtype.prototype.MethodByName = function(name) { return this.$val.MethodByName(name); };
	rtype.Ptr.prototype.PkgPath = function() {
		var t;
		t = this;
		return t.uncommonType.PkgPath();
	};
	rtype.prototype.PkgPath = function() { return this.$val.PkgPath(); };
	rtype.Ptr.prototype.Name = function() {
		var t;
		t = this;
		return t.uncommonType.Name();
	};
	rtype.prototype.Name = function() { return this.$val.Name(); };
	rtype.Ptr.prototype.ChanDir = function() {
		var t, tt;
		t = this;
		if (!((t.Kind() === 18))) {
			throw $panic(new $String("reflect: ChanDir of non-chan type"));
		}
		tt = t.chanType;
		return (tt.dir >> 0);
	};
	rtype.prototype.ChanDir = function() { return this.$val.ChanDir(); };
	rtype.Ptr.prototype.IsVariadic = function() {
		var t, tt;
		t = this;
		if (!((t.Kind() === 19))) {
			throw $panic(new $String("reflect: IsVariadic of non-func type"));
		}
		tt = t.funcType;
		return tt.dotdotdot;
	};
	rtype.prototype.IsVariadic = function() { return this.$val.IsVariadic(); };
	rtype.Ptr.prototype.Elem = function() {
		var t, _ref, tt, tt$1, tt$2, tt$3, tt$4;
		t = this;
		_ref = t.Kind();
		if (_ref === 17) {
			tt = t.arrayType;
			return toType(tt.elem);
		} else if (_ref === 18) {
			tt$1 = t.chanType;
			return toType(tt$1.elem);
		} else if (_ref === 21) {
			tt$2 = t.mapType;
			return toType(tt$2.elem);
		} else if (_ref === 22) {
			tt$3 = t.ptrType;
			return toType(tt$3.elem);
		} else if (_ref === 23) {
			tt$4 = t.sliceType;
			return toType(tt$4.elem);
		}
		throw $panic(new $String("reflect: Elem of invalid type"));
	};
	rtype.prototype.Elem = function() { return this.$val.Elem(); };
	rtype.Ptr.prototype.Field = function(i) {
		var t, tt, _struct;
		t = this;
		if (!((t.Kind() === 25))) {
			throw $panic(new $String("reflect: Field of non-struct type"));
		}
		tt = t.structType;
		return (_struct = tt.Field(i), new StructField.Ptr(_struct.Name, _struct.PkgPath, _struct.Type, _struct.Tag, _struct.Offset, _struct.Index, _struct.Anonymous));
	};
	rtype.prototype.Field = function(i) { return this.$val.Field(i); };
	rtype.Ptr.prototype.FieldByIndex = function(index) {
		var t, tt, _struct;
		t = this;
		if (!((t.Kind() === 25))) {
			throw $panic(new $String("reflect: FieldByIndex of non-struct type"));
		}
		tt = t.structType;
		return (_struct = tt.FieldByIndex(index), new StructField.Ptr(_struct.Name, _struct.PkgPath, _struct.Type, _struct.Tag, _struct.Offset, _struct.Index, _struct.Anonymous));
	};
	rtype.prototype.FieldByIndex = function(index) { return this.$val.FieldByIndex(index); };
	rtype.Ptr.prototype.FieldByName = function(name) {
		var t, tt;
		t = this;
		if (!((t.Kind() === 25))) {
			throw $panic(new $String("reflect: FieldByName of non-struct type"));
		}
		tt = t.structType;
		return tt.FieldByName(name);
	};
	rtype.prototype.FieldByName = function(name) { return this.$val.FieldByName(name); };
	rtype.Ptr.prototype.FieldByNameFunc = function(match) {
		var t, tt;
		t = this;
		if (!((t.Kind() === 25))) {
			throw $panic(new $String("reflect: FieldByNameFunc of non-struct type"));
		}
		tt = t.structType;
		return tt.FieldByNameFunc(match);
	};
	rtype.prototype.FieldByNameFunc = function(match) { return this.$val.FieldByNameFunc(match); };
	rtype.Ptr.prototype.In = function(i) {
		var t, tt, x;
		t = this;
		if (!((t.Kind() === 19))) {
			throw $panic(new $String("reflect: In of non-func type"));
		}
		tt = t.funcType;
		return toType((x = tt.in$2, ((i < 0 || i >= x.length) ? $throwRuntimeError("index out of range") : x.array[x.offset + i])));
	};
	rtype.prototype.In = function(i) { return this.$val.In(i); };
	rtype.Ptr.prototype.Key = function() {
		var t, tt;
		t = this;
		if (!((t.Kind() === 21))) {
			throw $panic(new $String("reflect: Key of non-map type"));
		}
		tt = t.mapType;
		return toType(tt.key);
	};
	rtype.prototype.Key = function() { return this.$val.Key(); };
	rtype.Ptr.prototype.Len = function() {
		var t, tt;
		t = this;
		if (!((t.Kind() === 17))) {
			throw $panic(new $String("reflect: Len of non-array type"));
		}
		tt = t.arrayType;
		return (tt.len >> 0);
	};
	rtype.prototype.Len = function() { return this.$val.Len(); };
	rtype.Ptr.prototype.NumField = function() {
		var t, tt;
		t = this;
		if (!((t.Kind() === 25))) {
			throw $panic(new $String("reflect: NumField of non-struct type"));
		}
		tt = t.structType;
		return tt.fields.length;
	};
	rtype.prototype.NumField = function() { return this.$val.NumField(); };
	rtype.Ptr.prototype.NumIn = function() {
		var t, tt;
		t = this;
		if (!((t.Kind() === 19))) {
			throw $panic(new $String("reflect: NumIn of non-func type"));
		}
		tt = t.funcType;
		return tt.in$2.length;
	};
	rtype.prototype.NumIn = function() { return this.$val.NumIn(); };
	rtype.Ptr.prototype.NumOut = function() {
		var t, tt;
		t = this;
		if (!((t.Kind() === 19))) {
			throw $panic(new $String("reflect: NumOut of non-func type"));
		}
		tt = t.funcType;
		return tt.out.length;
	};
	rtype.prototype.NumOut = function() { return this.$val.NumOut(); };
	rtype.Ptr.prototype.Out = function(i) {
		var t, tt, x;
		t = this;
		if (!((t.Kind() === 19))) {
			throw $panic(new $String("reflect: Out of non-func type"));
		}
		tt = t.funcType;
		return toType((x = tt.out, ((i < 0 || i >= x.length) ? $throwRuntimeError("index out of range") : x.array[x.offset + i])));
	};
	rtype.prototype.Out = function(i) { return this.$val.Out(i); };
	ChanDir.prototype.String = function() {
		var d, _ref;
		d = this.$val;
		_ref = d;
		if (_ref === 2) {
			return "chan<-";
		} else if (_ref === 1) {
			return "<-chan";
		} else if (_ref === 3) {
			return "chan";
		}
		return "ChanDir" + strconv.Itoa((d >> 0));
	};
	$ptrType(ChanDir).prototype.String = function() { return new ChanDir(this.$get()).String(); };
	interfaceType.Ptr.prototype.Method = function(i) {
		var m, t, _struct, _struct$1, x, p, _struct$2, _struct$3;
		m = new Method.Ptr();
		t = this;
		if (i < 0 || i >= t.methods.length) {
			return (_struct = m, new Method.Ptr(_struct.Name, _struct.PkgPath, _struct.Type, (_struct$1 = _struct.Func, new Value.Ptr(_struct$1.typ, _struct$1.val, _struct$1.flag)), _struct.Index));
		}
		p = (x = t.methods, ((i < 0 || i >= x.length) ? $throwRuntimeError("index out of range") : x.array[x.offset + i]));
		m.Name = p.name.$get();
		if (!($pointerIsEqual(p.pkgPath, ($ptrType($String)).nil))) {
			m.PkgPath = p.pkgPath.$get();
		}
		m.Type = toType(p.typ);
		m.Index = i;
		return (_struct$2 = m, new Method.Ptr(_struct$2.Name, _struct$2.PkgPath, _struct$2.Type, (_struct$3 = _struct$2.Func, new Value.Ptr(_struct$3.typ, _struct$3.val, _struct$3.flag)), _struct$2.Index));
	};
	interfaceType.prototype.Method = function(i) { return this.$val.Method(i); };
	interfaceType.Ptr.prototype.NumMethod = function() {
		var t;
		t = this;
		return t.methods.length;
	};
	interfaceType.prototype.NumMethod = function() { return this.$val.NumMethod(); };
	interfaceType.Ptr.prototype.MethodByName = function(name) {
		var m, ok, t, _struct, _struct$1, p, _ref, _i, i, x, _tmp, _struct$2, _struct$3, _tmp$1, _struct$4, _struct$5, _struct$6, _struct$7;
		m = new Method.Ptr();
		ok = false;
		t = this;
		if (t === ($ptrType(interfaceType)).nil) {
			return [(_struct = m, new Method.Ptr(_struct.Name, _struct.PkgPath, _struct.Type, (_struct$1 = _struct.Func, new Value.Ptr(_struct$1.typ, _struct$1.val, _struct$1.flag)), _struct.Index)), ok];
		}
		p = ($ptrType(imethod)).nil;
		_ref = t.methods;
		_i = 0;
		while (_i < _ref.length) {
			i = _i;
			p = (x = t.methods, ((i < 0 || i >= x.length) ? $throwRuntimeError("index out of range") : x.array[x.offset + i]));
			if (p.name.$get() === name) {
				_tmp = (_struct$2 = t.Method(i), new Method.Ptr(_struct$2.Name, _struct$2.PkgPath, _struct$2.Type, (_struct$3 = _struct$2.Func, new Value.Ptr(_struct$3.typ, _struct$3.val, _struct$3.flag)), _struct$2.Index)); _tmp$1 = true; m = _tmp; ok = _tmp$1;
				return [(_struct$4 = m, new Method.Ptr(_struct$4.Name, _struct$4.PkgPath, _struct$4.Type, (_struct$5 = _struct$4.Func, new Value.Ptr(_struct$5.typ, _struct$5.val, _struct$5.flag)), _struct$4.Index)), ok];
			}
			_i++;
		}
		return [(_struct$6 = m, new Method.Ptr(_struct$6.Name, _struct$6.PkgPath, _struct$6.Type, (_struct$7 = _struct$6.Func, new Value.Ptr(_struct$7.typ, _struct$7.val, _struct$7.flag)), _struct$6.Index)), ok];
	};
	interfaceType.prototype.MethodByName = function(name) { return this.$val.MethodByName(name); };
	StructTag.prototype.Get = function(key) {
		var tag, i, name, qvalue, _tuple, value;
		tag = this.$val;
		while (!(tag === "")) {
			i = 0;
			while (i < tag.length && (tag.charCodeAt(i) === 32)) {
				i = i + 1 >> 0;
			}
			tag = tag.substring(i);
			if (tag === "") {
				break;
			}
			i = 0;
			while (i < tag.length && !((tag.charCodeAt(i) === 32)) && !((tag.charCodeAt(i) === 58)) && !((tag.charCodeAt(i) === 34))) {
				i = i + 1 >> 0;
			}
			if ((i + 1 >> 0) >= tag.length || !((tag.charCodeAt(i) === 58)) || !((tag.charCodeAt((i + 1 >> 0)) === 34))) {
				break;
			}
			name = tag.substring(0, i);
			tag = tag.substring((i + 1 >> 0));
			i = 1;
			while (i < tag.length && !((tag.charCodeAt(i) === 34))) {
				if (tag.charCodeAt(i) === 92) {
					i = i + 1 >> 0;
				}
				i = i + 1 >> 0;
			}
			if (i >= tag.length) {
				break;
			}
			qvalue = tag.substring(0, (i + 1 >> 0));
			tag = tag.substring((i + 1 >> 0));
			if (key === name) {
				_tuple = strconv.Unquote(qvalue); value = _tuple[0];
				return value;
			}
		}
		return "";
	};
	$ptrType(StructTag).prototype.Get = function(key) { return new StructTag(this.$get()).Get(key); };
	structType.Ptr.prototype.Field = function(i) {
		var f, t, _struct, x, p, t$1, _struct$1;
		f = new StructField.Ptr();
		t = this;
		if (i < 0 || i >= t.fields.length) {
			return (_struct = f, new StructField.Ptr(_struct.Name, _struct.PkgPath, _struct.Type, _struct.Tag, _struct.Offset, _struct.Index, _struct.Anonymous));
		}
		p = (x = t.fields, ((i < 0 || i >= x.length) ? $throwRuntimeError("index out of range") : x.array[x.offset + i]));
		f.Type = toType(p.typ);
		if (!($pointerIsEqual(p.name, ($ptrType($String)).nil))) {
			f.Name = p.name.$get();
		} else {
			t$1 = f.Type;
			if (t$1.Kind() === 22) {
				t$1 = t$1.Elem();
			}
			f.Name = t$1.Name();
			f.Anonymous = true;
		}
		if (!($pointerIsEqual(p.pkgPath, ($ptrType($String)).nil))) {
			f.PkgPath = p.pkgPath.$get();
		}
		if (!($pointerIsEqual(p.tag, ($ptrType($String)).nil))) {
			f.Tag = p.tag.$get();
		}
		f.Offset = p.offset;
		f.Index = new ($sliceType($Int))([i]);
		return (_struct$1 = f, new StructField.Ptr(_struct$1.Name, _struct$1.PkgPath, _struct$1.Type, _struct$1.Tag, _struct$1.Offset, _struct$1.Index, _struct$1.Anonymous));
	};
	structType.prototype.Field = function(i) { return this.$val.Field(i); };
	structType.Ptr.prototype.FieldByIndex = function(index) {
		var f, t, _ref, _i, x, i, ft, _struct, _struct$1;
		f = new StructField.Ptr();
		t = this;
		f.Type = toType(t.rtype);
		_ref = index;
		_i = 0;
		while (_i < _ref.length) {
			x = ((_i < 0 || _i >= _ref.length) ? $throwRuntimeError("index out of range") : _ref.array[_ref.offset + _i]);
			i = _i;
			if (i > 0) {
				ft = f.Type;
				if ((ft.Kind() === 22) && (ft.Elem().Kind() === 25)) {
					ft = ft.Elem();
				}
				f.Type = ft;
			}
			f = (_struct = f.Type.Field(x), new StructField.Ptr(_struct.Name, _struct.PkgPath, _struct.Type, _struct.Tag, _struct.Offset, _struct.Index, _struct.Anonymous));
			_i++;
		}
		return (_struct$1 = f, new StructField.Ptr(_struct$1.Name, _struct$1.PkgPath, _struct$1.Type, _struct$1.Tag, _struct$1.Offset, _struct$1.Index, _struct$1.Anonymous));
	};
	structType.prototype.FieldByIndex = function(index) { return this.$val.FieldByIndex(index); };
	structType.Ptr.prototype.FieldByNameFunc = function(match) {
		var result, ok, t, current, next, nextCount, _map, _key, visited, _tmp, _tmp$1, count, _ref, _i, _struct, scan, t$1, _entry, _key$1, _ref$1, _i$1, i, x, f, fname, ntyp, _entry$1, _tmp$2, _tmp$3, _struct$1, _struct$2, styp, _entry$2, _key$2, _map$1, _key$3, _key$4, _entry$3, _key$5, index, _struct$3;
		result = new StructField.Ptr();
		ok = false;
		t = this;
		current = new ($sliceType(fieldScan))([]);
		next = new ($sliceType(fieldScan))([new fieldScan.Ptr(t, ($sliceType($Int)).nil)]);
		nextCount = false;
		visited = (_map = new $Map(), _map);
		while (next.length > 0) {
			_tmp = next; _tmp$1 = $subslice(current, 0, 0); current = _tmp; next = _tmp$1;
			count = nextCount;
			nextCount = false;
			_ref = current;
			_i = 0;
			while (_i < _ref.length) {
				scan = (_struct = ((_i < 0 || _i >= _ref.length) ? $throwRuntimeError("index out of range") : _ref.array[_ref.offset + _i]), new fieldScan.Ptr(_struct.typ, _struct.index));
				t$1 = scan.typ;
				if ((_entry = visited[t$1.$key()], _entry !== undefined ? _entry.v : false)) {
					_i++;
					continue;
				}
				_key$1 = t$1; (visited || $throwRuntimeError("assignment to entry in nil map"))[_key$1.$key()] = { k: _key$1, v: true };
				_ref$1 = t$1.fields;
				_i$1 = 0;
				while (_i$1 < _ref$1.length) {
					i = _i$1;
					f = (x = t$1.fields, ((i < 0 || i >= x.length) ? $throwRuntimeError("index out of range") : x.array[x.offset + i]));
					fname = "";
					ntyp = ($ptrType(rtype)).nil;
					if (!($pointerIsEqual(f.name, ($ptrType($String)).nil))) {
						fname = f.name.$get();
					} else {
						ntyp = f.typ;
						if (ntyp.Kind() === 22) {
							ntyp = ntyp.Elem().common();
						}
						fname = ntyp.Name();
					}
					if (match(fname)) {
						if ((_entry$1 = count[t$1.$key()], _entry$1 !== undefined ? _entry$1.v : 0) > 1 || ok) {
							_tmp$2 = new StructField.Ptr("", "", null, "", 0, ($sliceType($Int)).nil, false); _tmp$3 = false; result = _tmp$2; ok = _tmp$3;
							return [(_struct$1 = result, new StructField.Ptr(_struct$1.Name, _struct$1.PkgPath, _struct$1.Type, _struct$1.Tag, _struct$1.Offset, _struct$1.Index, _struct$1.Anonymous)), ok];
						}
						result = (_struct$2 = t$1.Field(i), new StructField.Ptr(_struct$2.Name, _struct$2.PkgPath, _struct$2.Type, _struct$2.Tag, _struct$2.Offset, _struct$2.Index, _struct$2.Anonymous));
						result.Index = ($sliceType($Int)).nil;
						result.Index = $appendSlice(result.Index, scan.index);
						result.Index = $append(result.Index, i);
						ok = true;
						_i$1++;
						continue;
					}
					if (ok || ntyp === ($ptrType(rtype)).nil || !((ntyp.Kind() === 25))) {
						_i$1++;
						continue;
					}
					styp = ntyp.structType;
					if ((_entry$2 = nextCount[styp.$key()], _entry$2 !== undefined ? _entry$2.v : 0) > 0) {
						_key$2 = styp; (nextCount || $throwRuntimeError("assignment to entry in nil map"))[_key$2.$key()] = { k: _key$2, v: 2 };
						_i$1++;
						continue;
					}
					if (nextCount === false) {
						nextCount = (_map$1 = new $Map(), _map$1);
					}
					_key$4 = styp; (nextCount || $throwRuntimeError("assignment to entry in nil map"))[_key$4.$key()] = { k: _key$4, v: 1 };
					if ((_entry$3 = count[t$1.$key()], _entry$3 !== undefined ? _entry$3.v : 0) > 1) {
						_key$5 = styp; (nextCount || $throwRuntimeError("assignment to entry in nil map"))[_key$5.$key()] = { k: _key$5, v: 2 };
					}
					index = ($sliceType($Int)).nil;
					index = $appendSlice(index, scan.index);
					index = $append(index, i);
					next = $append(next, new fieldScan.Ptr(styp, index));
					_i$1++;
				}
				_i++;
			}
			if (ok) {
				break;
			}
		}
		return [(_struct$3 = result, new StructField.Ptr(_struct$3.Name, _struct$3.PkgPath, _struct$3.Type, _struct$3.Tag, _struct$3.Offset, _struct$3.Index, _struct$3.Anonymous)), ok];
	};
	structType.prototype.FieldByNameFunc = function(match) { return this.$val.FieldByNameFunc(match); };
	structType.Ptr.prototype.FieldByName = function(name) {
		var f, present, t, hasAnon, _ref, _i, i, x, tf, _tmp, _struct, _tmp$1, _struct$1, _struct$2, _tuple, _struct$3, _struct$4;
		f = new StructField.Ptr();
		present = false;
		t = this;
		hasAnon = false;
		if (!(name === "")) {
			_ref = t.fields;
			_i = 0;
			while (_i < _ref.length) {
				i = _i;
				tf = (x = t.fields, ((i < 0 || i >= x.length) ? $throwRuntimeError("index out of range") : x.array[x.offset + i]));
				if ($pointerIsEqual(tf.name, ($ptrType($String)).nil)) {
					hasAnon = true;
					_i++;
					continue;
				}
				if (tf.name.$get() === name) {
					_tmp = (_struct = t.Field(i), new StructField.Ptr(_struct.Name, _struct.PkgPath, _struct.Type, _struct.Tag, _struct.Offset, _struct.Index, _struct.Anonymous)); _tmp$1 = true; f = _tmp; present = _tmp$1;
					return [(_struct$1 = f, new StructField.Ptr(_struct$1.Name, _struct$1.PkgPath, _struct$1.Type, _struct$1.Tag, _struct$1.Offset, _struct$1.Index, _struct$1.Anonymous)), present];
				}
				_i++;
			}
		}
		if (!hasAnon) {
			return [(_struct$2 = f, new StructField.Ptr(_struct$2.Name, _struct$2.PkgPath, _struct$2.Type, _struct$2.Tag, _struct$2.Offset, _struct$2.Index, _struct$2.Anonymous)), present];
		}
		_tuple = t.FieldByNameFunc((function(s) {
			return s === name;
		})); f = (_struct$3 = _tuple[0], new StructField.Ptr(_struct$3.Name, _struct$3.PkgPath, _struct$3.Type, _struct$3.Tag, _struct$3.Offset, _struct$3.Index, _struct$3.Anonymous)); present = _tuple[1];
		return [(_struct$4 = f, new StructField.Ptr(_struct$4.Name, _struct$4.PkgPath, _struct$4.Type, _struct$4.Tag, _struct$4.Offset, _struct$4.Index, _struct$4.Anonymous)), present];
	};
	structType.prototype.FieldByName = function(name) { return this.$val.FieldByName(name); };
	PtrTo = $pkg.PtrTo = function(t) {
		return (t !== null && t.constructor === ($ptrType(rtype)) ? t.$val : $typeAssertionFailed(t, ($ptrType(rtype)))).ptrTo();
	};
	rtype.Ptr.prototype.Implements = function(u) {
		var t;
		t = this;
		if ($interfaceIsEqual(u, null)) {
			throw $panic(new $String("reflect: nil type passed to Type.Implements"));
		}
		if (!((u.Kind() === 20))) {
			throw $panic(new $String("reflect: non-interface type passed to Type.Implements"));
		}
		return implements$1((u !== null && u.constructor === ($ptrType(rtype)) ? u.$val : $typeAssertionFailed(u, ($ptrType(rtype)))), t);
	};
	rtype.prototype.Implements = function(u) { return this.$val.Implements(u); };
	rtype.Ptr.prototype.AssignableTo = function(u) {
		var t, uu;
		t = this;
		if ($interfaceIsEqual(u, null)) {
			throw $panic(new $String("reflect: nil type passed to Type.AssignableTo"));
		}
		uu = (u !== null && u.constructor === ($ptrType(rtype)) ? u.$val : $typeAssertionFailed(u, ($ptrType(rtype))));
		return directlyAssignable(uu, t) || implements$1(uu, t);
	};
	rtype.prototype.AssignableTo = function(u) { return this.$val.AssignableTo(u); };
	rtype.Ptr.prototype.ConvertibleTo = function(u) {
		var t, uu;
		t = this;
		if ($interfaceIsEqual(u, null)) {
			throw $panic(new $String("reflect: nil type passed to Type.ConvertibleTo"));
		}
		uu = (u !== null && u.constructor === ($ptrType(rtype)) ? u.$val : $typeAssertionFailed(u, ($ptrType(rtype))));
		return !(convertOp(uu, t) === $throwNilPointerError);
	};
	rtype.prototype.ConvertibleTo = function(u) { return this.$val.ConvertibleTo(u); };
	implements$1 = function(T, V) {
		var t, v, i, j, x, tm, x$1, vm, v$1, i$1, j$1, x$2, tm$1, x$3, vm$1;
		if (!((T.Kind() === 20))) {
			return false;
		}
		t = T.interfaceType;
		if (t.methods.length === 0) {
			return true;
		}
		if (V.Kind() === 20) {
			v = V.interfaceType;
			i = 0;
			j = 0;
			while (j < v.methods.length) {
				tm = (x = t.methods, ((i < 0 || i >= x.length) ? $throwRuntimeError("index out of range") : x.array[x.offset + i]));
				vm = (x$1 = v.methods, ((j < 0 || j >= x$1.length) ? $throwRuntimeError("index out of range") : x$1.array[x$1.offset + j]));
				if ($pointerIsEqual(vm.name, tm.name) && $pointerIsEqual(vm.pkgPath, tm.pkgPath) && vm.typ === tm.typ) {
					i = i + 1 >> 0;
					if (i >= t.methods.length) {
						return true;
					}
				}
				j = j + 1 >> 0;
			}
			return false;
		}
		v$1 = V.uncommonType.uncommon();
		if (v$1 === ($ptrType(uncommonType)).nil) {
			return false;
		}
		i$1 = 0;
		j$1 = 0;
		while (j$1 < v$1.methods.length) {
			tm$1 = (x$2 = t.methods, ((i$1 < 0 || i$1 >= x$2.length) ? $throwRuntimeError("index out of range") : x$2.array[x$2.offset + i$1]));
			vm$1 = (x$3 = v$1.methods, ((j$1 < 0 || j$1 >= x$3.length) ? $throwRuntimeError("index out of range") : x$3.array[x$3.offset + j$1]));
			if ($pointerIsEqual(vm$1.name, tm$1.name) && $pointerIsEqual(vm$1.pkgPath, tm$1.pkgPath) && vm$1.mtyp === tm$1.typ) {
				i$1 = i$1 + 1 >> 0;
				if (i$1 >= t.methods.length) {
					return true;
				}
			}
			j$1 = j$1 + 1 >> 0;
		}
		return false;
	};
	directlyAssignable = function(T, V) {
		if (T === V) {
			return true;
		}
		if (!(T.Name() === "") && !(V.Name() === "") || !((T.Kind() === V.Kind()))) {
			return false;
		}
		return haveIdenticalUnderlyingType(T, V);
	};
	haveIdenticalUnderlyingType = function(T, V) {
		var kind, _ref, t, v, _ref$1, _i, typ, i, x, _ref$2, _i$1, typ$1, i$1, x$1, t$1, v$1, t$2, v$2, _ref$3, _i$2, i$2, x$2, tf, x$3, vf;
		if (T === V) {
			return true;
		}
		kind = T.Kind();
		if (!((kind === V.Kind()))) {
			return false;
		}
		if (1 <= kind && kind <= 16 || (kind === 24) || (kind === 26)) {
			return true;
		}
		_ref = kind;
		if (_ref === 17) {
			return $interfaceIsEqual(T.Elem(), V.Elem()) && (T.Len() === V.Len());
		} else if (_ref === 18) {
			if ((V.ChanDir() === 3) && $interfaceIsEqual(T.Elem(), V.Elem())) {
				return true;
			}
			return (V.ChanDir() === T.ChanDir()) && $interfaceIsEqual(T.Elem(), V.Elem());
		} else if (_ref === 19) {
			t = T.funcType;
			v = V.funcType;
			if (!(t.dotdotdot === v.dotdotdot) || !((t.in$2.length === v.in$2.length)) || !((t.out.length === v.out.length))) {
				return false;
			}
			_ref$1 = t.in$2;
			_i = 0;
			while (_i < _ref$1.length) {
				typ = ((_i < 0 || _i >= _ref$1.length) ? $throwRuntimeError("index out of range") : _ref$1.array[_ref$1.offset + _i]);
				i = _i;
				if (!(typ === (x = v.in$2, ((i < 0 || i >= x.length) ? $throwRuntimeError("index out of range") : x.array[x.offset + i])))) {
					return false;
				}
				_i++;
			}
			_ref$2 = t.out;
			_i$1 = 0;
			while (_i$1 < _ref$2.length) {
				typ$1 = ((_i$1 < 0 || _i$1 >= _ref$2.length) ? $throwRuntimeError("index out of range") : _ref$2.array[_ref$2.offset + _i$1]);
				i$1 = _i$1;
				if (!(typ$1 === (x$1 = v.out, ((i$1 < 0 || i$1 >= x$1.length) ? $throwRuntimeError("index out of range") : x$1.array[x$1.offset + i$1])))) {
					return false;
				}
				_i$1++;
			}
			return true;
		} else if (_ref === 20) {
			t$1 = T.interfaceType;
			v$1 = V.interfaceType;
			if ((t$1.methods.length === 0) && (v$1.methods.length === 0)) {
				return true;
			}
			return false;
		} else if (_ref === 21) {
			return $interfaceIsEqual(T.Key(), V.Key()) && $interfaceIsEqual(T.Elem(), V.Elem());
		} else if (_ref === 22 || _ref === 23) {
			return $interfaceIsEqual(T.Elem(), V.Elem());
		} else if (_ref === 25) {
			t$2 = T.structType;
			v$2 = V.structType;
			if (!((t$2.fields.length === v$2.fields.length))) {
				return false;
			}
			_ref$3 = t$2.fields;
			_i$2 = 0;
			while (_i$2 < _ref$3.length) {
				i$2 = _i$2;
				tf = (x$2 = t$2.fields, ((i$2 < 0 || i$2 >= x$2.length) ? $throwRuntimeError("index out of range") : x$2.array[x$2.offset + i$2]));
				vf = (x$3 = v$2.fields, ((i$2 < 0 || i$2 >= x$3.length) ? $throwRuntimeError("index out of range") : x$3.array[x$3.offset + i$2]));
				if (!($pointerIsEqual(tf.name, vf.name)) && ($pointerIsEqual(tf.name, ($ptrType($String)).nil) || $pointerIsEqual(vf.name, ($ptrType($String)).nil) || !(tf.name.$get() === vf.name.$get()))) {
					return false;
				}
				if (!($pointerIsEqual(tf.pkgPath, vf.pkgPath)) && ($pointerIsEqual(tf.pkgPath, ($ptrType($String)).nil) || $pointerIsEqual(vf.pkgPath, ($ptrType($String)).nil) || !(tf.pkgPath.$get() === vf.pkgPath.$get()))) {
					return false;
				}
				if (!(tf.typ === vf.typ)) {
					return false;
				}
				if (!($pointerIsEqual(tf.tag, vf.tag)) && ($pointerIsEqual(tf.tag, ($ptrType($String)).nil) || $pointerIsEqual(vf.tag, ($ptrType($String)).nil) || !(tf.tag.$get() === vf.tag.$get()))) {
					return false;
				}
				if (!((tf.offset === vf.offset))) {
					return false;
				}
				_i$2++;
			}
			return true;
		}
		return false;
	};
	toType = function(t) {
		if (t === ($ptrType(rtype)).nil) {
			return null;
		}
		return t;
	};
	flag.prototype.kind = function() {
		var f;
		f = this.$val;
		return (((((f >>> 4 >>> 0)) & 31) >>> 0) >>> 0);
	};
	$ptrType(flag).prototype.kind = function() { return new flag(this.$get()).kind(); };
	ValueError.Ptr.prototype.Error = function() {
		var e;
		e = this;
		if (e.Kind === 0) {
			return "reflect: call of " + e.Method + " on zero Value";
		}
		return "reflect: call of " + e.Method + " on " + (new Kind(e.Kind)).String() + " Value";
	};
	ValueError.prototype.Error = function() { return this.$val.Error(); };
	flag.prototype.mustBe = function(expected) {
		var f, k;
		f = this.$val;
		k = (new flag(f)).kind();
		if (!((k === expected))) {
			throw $panic(new ValueError.Ptr(methodName(), k));
		}
	};
	$ptrType(flag).prototype.mustBe = function(expected) { return new flag(this.$get()).mustBe(expected); };
	flag.prototype.mustBeExported = function() {
		var f;
		f = this.$val;
		if (f === 0) {
			throw $panic(new ValueError.Ptr(methodName(), 0));
		}
		if (!((((f & 1) >>> 0) === 0))) {
			throw $panic(new $String("reflect: " + methodName() + " using value obtained using unexported field"));
		}
	};
	$ptrType(flag).prototype.mustBeExported = function() { return new flag(this.$get()).mustBeExported(); };
	flag.prototype.mustBeAssignable = function() {
		var f;
		f = this.$val;
		if (f === 0) {
			throw $panic(new ValueError.Ptr(methodName(), 0));
		}
		if (!((((f & 1) >>> 0) === 0))) {
			throw $panic(new $String("reflect: " + methodName() + " using value obtained using unexported field"));
		}
		if (((f & 4) >>> 0) === 0) {
			throw $panic(new $String("reflect: " + methodName() + " using unaddressable value"));
		}
	};
	$ptrType(flag).prototype.mustBeAssignable = function() { return new flag(this.$get()).mustBeAssignable(); };
	Value.Ptr.prototype.Addr = function() {
		var _struct, v;
		v = (_struct = this, new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
		if (((v.flag & 4) >>> 0) === 0) {
			throw $panic(new $String("reflect.Value.Addr of unaddressable value"));
		}
		return new Value.Ptr(v.typ.ptrTo(), v.val, ((((v.flag & 1) >>> 0)) | 352) >>> 0);
	};
	Value.prototype.Addr = function() { return this.$val.Addr(); };
	Value.Ptr.prototype.Bool = function() {
		var _struct, v;
		v = (_struct = this, new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
		(new flag(v.flag)).mustBe(1);
		if (!((((v.flag & 2) >>> 0) === 0))) {
			return v.val.$get();
		}
		return v.val;
	};
	Value.prototype.Bool = function() { return this.$val.Bool(); };
	Value.Ptr.prototype.Bytes = function() {
		var _struct, v;
		v = (_struct = this, new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
		(new flag(v.flag)).mustBe(23);
		if (!((v.typ.Elem().Kind() === 8))) {
			throw $panic(new $String("reflect.Value.Bytes of non-byte slice"));
		}
		return v.val.$get();
	};
	Value.prototype.Bytes = function() { return this.$val.Bytes(); };
	Value.Ptr.prototype.runes = function() {
		var _struct, v;
		v = (_struct = this, new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
		(new flag(v.flag)).mustBe(23);
		if (!((v.typ.Elem().Kind() === 5))) {
			throw $panic(new $String("reflect.Value.Bytes of non-rune slice"));
		}
		return v.val.$get();
	};
	Value.prototype.runes = function() { return this.$val.runes(); };
	Value.Ptr.prototype.CanAddr = function() {
		var _struct, v;
		v = (_struct = this, new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
		return !((((v.flag & 4) >>> 0) === 0));
	};
	Value.prototype.CanAddr = function() { return this.$val.CanAddr(); };
	Value.Ptr.prototype.CanSet = function() {
		var _struct, v;
		v = (_struct = this, new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
		return ((v.flag & 5) >>> 0) === 4;
	};
	Value.prototype.CanSet = function() { return this.$val.CanSet(); };
	Value.Ptr.prototype.Call = function(in$1) {
		var _struct, v;
		v = (_struct = this, new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
		(new flag(v.flag)).mustBe(19);
		(new flag(v.flag)).mustBeExported();
		return v.call("Call", in$1);
	};
	Value.prototype.Call = function(in$1) { return this.$val.Call(in$1); };
	Value.Ptr.prototype.CallSlice = function(in$1) {
		var _struct, v;
		v = (_struct = this, new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
		(new flag(v.flag)).mustBe(19);
		(new flag(v.flag)).mustBeExported();
		return v.call("CallSlice", in$1);
	};
	Value.prototype.CallSlice = function(in$1) { return this.$val.CallSlice(in$1); };
	Value.Ptr.prototype.Close = function() {
		var _struct, v;
		v = (_struct = this, new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
		(new flag(v.flag)).mustBe(18);
		(new flag(v.flag)).mustBeExported();
		chanclose(v.iword());
	};
	Value.prototype.Close = function() { return this.$val.Close(); };
	Value.Ptr.prototype.Complex = function() {
		var _struct, v, k, _ref, x, x$1;
		v = (_struct = this, new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
		k = (new flag(v.flag)).kind();
		_ref = k;
		if (_ref === 15) {
			if (!((((v.flag & 2) >>> 0) === 0))) {
				return (x = v.val.$get(), new $Complex128(x.real, x.imag));
			}
			return (x$1 = v.val, new $Complex128(x$1.real, x$1.imag));
		} else if (_ref === 16) {
			return v.val.$get();
		}
		throw $panic(new ValueError.Ptr("reflect.Value.Complex", k));
	};
	Value.prototype.Complex = function() { return this.$val.Complex(); };
	Value.Ptr.prototype.FieldByIndex = function(index) {
		var _struct, v, _ref, _i, x, i, _struct$1, _struct$2, _struct$3;
		v = (_struct = this, new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
		(new flag(v.flag)).mustBe(25);
		_ref = index;
		_i = 0;
		while (_i < _ref.length) {
			x = ((_i < 0 || _i >= _ref.length) ? $throwRuntimeError("index out of range") : _ref.array[_ref.offset + _i]);
			i = _i;
			if (i > 0) {
				if ((v.Kind() === 22) && (v.Elem().Kind() === 25)) {
					v = (_struct$1 = v.Elem(), new Value.Ptr(_struct$1.typ, _struct$1.val, _struct$1.flag));
				}
			}
			v = (_struct$2 = v.Field(x), new Value.Ptr(_struct$2.typ, _struct$2.val, _struct$2.flag));
			_i++;
		}
		return (_struct$3 = v, new Value.Ptr(_struct$3.typ, _struct$3.val, _struct$3.flag));
	};
	Value.prototype.FieldByIndex = function(index) { return this.$val.FieldByIndex(index); };
	Value.Ptr.prototype.FieldByName = function(name) {
		var _struct, v, _tuple, _struct$1, f, ok, _struct$2;
		v = (_struct = this, new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
		(new flag(v.flag)).mustBe(25);
		_tuple = v.typ.FieldByName(name); f = (_struct$1 = _tuple[0], new StructField.Ptr(_struct$1.Name, _struct$1.PkgPath, _struct$1.Type, _struct$1.Tag, _struct$1.Offset, _struct$1.Index, _struct$1.Anonymous)); ok = _tuple[1];
		if (ok) {
			return (_struct$2 = v.FieldByIndex(f.Index), new Value.Ptr(_struct$2.typ, _struct$2.val, _struct$2.flag));
		}
		return new Value.Ptr(($ptrType(rtype)).nil, 0, 0);
	};
	Value.prototype.FieldByName = function(name) { return this.$val.FieldByName(name); };
	Value.Ptr.prototype.FieldByNameFunc = function(match) {
		var _struct, v, _tuple, _struct$1, f, ok, _struct$2;
		v = (_struct = this, new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
		(new flag(v.flag)).mustBe(25);
		_tuple = v.typ.FieldByNameFunc(match); f = (_struct$1 = _tuple[0], new StructField.Ptr(_struct$1.Name, _struct$1.PkgPath, _struct$1.Type, _struct$1.Tag, _struct$1.Offset, _struct$1.Index, _struct$1.Anonymous)); ok = _tuple[1];
		if (ok) {
			return (_struct$2 = v.FieldByIndex(f.Index), new Value.Ptr(_struct$2.typ, _struct$2.val, _struct$2.flag));
		}
		return new Value.Ptr(($ptrType(rtype)).nil, 0, 0);
	};
	Value.prototype.FieldByNameFunc = function(match) { return this.$val.FieldByNameFunc(match); };
	Value.Ptr.prototype.Float = function() {
		var _struct, v, k, _ref;
		v = (_struct = this, new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
		k = (new flag(v.flag)).kind();
		_ref = k;
		if (_ref === 13) {
			if (!((((v.flag & 2) >>> 0) === 0))) {
				return $coerceFloat32(v.val.$get());
			}
			return $coerceFloat32(v.val);
		} else if (_ref === 14) {
			if (!((((v.flag & 2) >>> 0) === 0))) {
				return v.val.$get();
			}
			return v.val;
		}
		throw $panic(new ValueError.Ptr("reflect.Value.Float", k));
	};
	Value.prototype.Float = function() { return this.$val.Float(); };
	Value.Ptr.prototype.Int = function() {
		var _struct, v, k, p, v$1, _ref;
		v = (_struct = this, new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
		k = (new flag(v.flag)).kind();
		p = 0;
		if (!((((v.flag & 2) >>> 0) === 0))) {
			p = v.val;
		} else {
			p = new ($ptrType($UnsafePointer))(function() { return v.val; }, function(v$1) { v.val = v$1;; });
		}
		_ref = k;
		if (_ref === 2) {
			return new $Int64(0, p.$get());
		} else if (_ref === 3) {
			return new $Int64(0, p.$get());
		} else if (_ref === 4) {
			return new $Int64(0, p.$get());
		} else if (_ref === 5) {
			return new $Int64(0, p.$get());
		} else if (_ref === 6) {
			return p.$get();
		}
		throw $panic(new ValueError.Ptr("reflect.Value.Int", k));
	};
	Value.prototype.Int = function() { return this.$val.Int(); };
	Value.Ptr.prototype.CanInterface = function() {
		var _struct, v;
		v = (_struct = this, new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
		if (v.flag === 0) {
			throw $panic(new ValueError.Ptr("reflect.Value.CanInterface", 0));
		}
		return ((v.flag & 1) >>> 0) === 0;
	};
	Value.prototype.CanInterface = function() { return this.$val.CanInterface(); };
	Value.Ptr.prototype.Interface = function() {
		var i, _struct, v, _struct$1;
		i = null;
		v = (_struct = this, new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
		i = valueInterface((_struct$1 = v, new Value.Ptr(_struct$1.typ, _struct$1.val, _struct$1.flag)), true);
		return i;
	};
	Value.prototype.Interface = function() { return this.$val.Interface(); };
	Value.Ptr.prototype.InterfaceData = function() {
		var _struct, v;
		v = (_struct = this, new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
		(new flag(v.flag)).mustBe(20);
		return $mapArray(v.val, function(entry) { return entry; });
	};
	Value.prototype.InterfaceData = function() { return this.$val.InterfaceData(); };
	Value.Ptr.prototype.IsValid = function() {
		var _struct, v;
		v = (_struct = this, new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
		return !((v.flag === 0));
	};
	Value.prototype.IsValid = function() { return this.$val.IsValid(); };
	Value.Ptr.prototype.Kind = function() {
		var _struct, v;
		v = (_struct = this, new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
		return (new flag(v.flag)).kind();
	};
	Value.prototype.Kind = function() { return this.$val.Kind(); };
	Value.Ptr.prototype.MapIndex = function(key) {
		var _struct, v, tt, _struct$1, _tuple, word, ok, typ, fl;
		v = (_struct = this, new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
		(new flag(v.flag)).mustBe(21);
		tt = v.typ.mapType;
		key = (_struct$1 = key.assignTo("reflect.Value.MapIndex", tt.key, ($ptrType($emptyInterface)).nil), new Value.Ptr(_struct$1.typ, _struct$1.val, _struct$1.flag));
		_tuple = mapaccess(v.typ, v.iword(), key.iword()); word = _tuple[0]; ok = _tuple[1];
		if (!ok) {
			return new Value.Ptr(($ptrType(rtype)).nil, 0, 0);
		}
		typ = tt.elem;
		fl = ((((v.flag | key.flag) >>> 0)) & 1) >>> 0;
		if (typ.size > 4) {
			fl = (fl | 2) >>> 0;
		}
		fl = (fl | (((typ.Kind() >>> 0) << 4 >>> 0))) >>> 0;
		return new Value.Ptr(typ, word, fl);
	};
	Value.prototype.MapIndex = function(key) { return this.$val.MapIndex(key); };
	Value.Ptr.prototype.MapKeys = function() {
		var _struct, v, tt, keyType, fl, m, mlen, it, a, i, _tuple, keyWord, ok;
		v = (_struct = this, new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
		(new flag(v.flag)).mustBe(21);
		tt = v.typ.mapType;
		keyType = tt.key;
		fl = (v.flag & 1) >>> 0;
		fl = (fl | (((keyType.Kind() >>> 0) << 4 >>> 0))) >>> 0;
		if (keyType.size > 4) {
			fl = (fl | 2) >>> 0;
		}
		m = v.iword();
		mlen = 0;
		if (!(m === 0)) {
			mlen = maplen(m);
		}
		it = mapiterinit(v.typ, m);
		a = ($sliceType(Value)).make(mlen, 0, function() { return new Value.Ptr(); });
		i = 0;
		i = 0;
		while (i < a.length) {
			_tuple = mapiterkey(it); keyWord = _tuple[0]; ok = _tuple[1];
			if (!ok) {
				break;
			}
			(i < 0 || i >= a.length) ? $throwRuntimeError("index out of range") : a.array[a.offset + i] = new Value.Ptr(keyType, keyWord, fl);
			mapiternext(it);
			i = i + 1 >> 0;
		}
		return $subslice(a, 0, i);
	};
	Value.prototype.MapKeys = function() { return this.$val.MapKeys(); };
	Value.Ptr.prototype.Method = function(i) {
		var _struct, v, fl;
		v = (_struct = this, new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
		if (v.typ === ($ptrType(rtype)).nil) {
			throw $panic(new ValueError.Ptr("reflect.Value.Method", 0));
		}
		if (!((((v.flag & 8) >>> 0) === 0)) || i < 0 || i >= v.typ.NumMethod()) {
			throw $panic(new $String("reflect: Method index out of range"));
		}
		if ((v.typ.Kind() === 20) && v.IsNil()) {
			throw $panic(new $String("reflect: Method on nil interface value"));
		}
		fl = (v.flag & 3) >>> 0;
		fl = (fl | 304) >>> 0;
		fl = (fl | (((((i >>> 0) << 9 >>> 0) | 8) >>> 0))) >>> 0;
		return new Value.Ptr(v.typ, v.val, fl);
	};
	Value.prototype.Method = function(i) { return this.$val.Method(i); };
	Value.Ptr.prototype.NumMethod = function() {
		var _struct, v;
		v = (_struct = this, new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
		if (v.typ === ($ptrType(rtype)).nil) {
			throw $panic(new ValueError.Ptr("reflect.Value.NumMethod", 0));
		}
		if (!((((v.flag & 8) >>> 0) === 0))) {
			return 0;
		}
		return v.typ.NumMethod();
	};
	Value.prototype.NumMethod = function() { return this.$val.NumMethod(); };
	Value.Ptr.prototype.MethodByName = function(name) {
		var _struct, v, _tuple, _struct$1, _struct$2, m, ok, _struct$3;
		v = (_struct = this, new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
		if (v.typ === ($ptrType(rtype)).nil) {
			throw $panic(new ValueError.Ptr("reflect.Value.MethodByName", 0));
		}
		if (!((((v.flag & 8) >>> 0) === 0))) {
			return new Value.Ptr(($ptrType(rtype)).nil, 0, 0);
		}
		_tuple = v.typ.MethodByName(name); m = (_struct$1 = _tuple[0], new Method.Ptr(_struct$1.Name, _struct$1.PkgPath, _struct$1.Type, (_struct$2 = _struct$1.Func, new Value.Ptr(_struct$2.typ, _struct$2.val, _struct$2.flag)), _struct$1.Index)); ok = _tuple[1];
		if (!ok) {
			return new Value.Ptr(($ptrType(rtype)).nil, 0, 0);
		}
		return (_struct$3 = v.Method(m.Index), new Value.Ptr(_struct$3.typ, _struct$3.val, _struct$3.flag));
	};
	Value.prototype.MethodByName = function(name) { return this.$val.MethodByName(name); };
	Value.Ptr.prototype.NumField = function() {
		var _struct, v, tt;
		v = (_struct = this, new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
		(new flag(v.flag)).mustBe(25);
		tt = v.typ.structType;
		return tt.fields.length;
	};
	Value.prototype.NumField = function() { return this.$val.NumField(); };
	Value.Ptr.prototype.OverflowComplex = function(x) {
		var _struct, v, k, _ref;
		v = (_struct = this, new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
		k = (new flag(v.flag)).kind();
		_ref = k;
		if (_ref === 15) {
			return overflowFloat32(x.real) || overflowFloat32(x.imag);
		} else if (_ref === 16) {
			return false;
		}
		throw $panic(new ValueError.Ptr("reflect.Value.OverflowComplex", k));
	};
	Value.prototype.OverflowComplex = function(x) { return this.$val.OverflowComplex(x); };
	Value.Ptr.prototype.OverflowFloat = function(x) {
		var _struct, v, k, _ref;
		v = (_struct = this, new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
		k = (new flag(v.flag)).kind();
		_ref = k;
		if (_ref === 13) {
			return overflowFloat32(x);
		} else if (_ref === 14) {
			return false;
		}
		throw $panic(new ValueError.Ptr("reflect.Value.OverflowFloat", k));
	};
	Value.prototype.OverflowFloat = function(x) { return this.$val.OverflowFloat(x); };
	overflowFloat32 = function(x) {
		if (x < 0) {
			x = -x;
		}
		return 3.4028234663852886e+38 < x && x <= 1.7976931348623157e+308;
	};
	Value.Ptr.prototype.OverflowInt = function(x) {
		var _struct, v, k, _ref, x$1, bitSize, trunc;
		v = (_struct = this, new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
		k = (new flag(v.flag)).kind();
		_ref = k;
		if (_ref === 2 || _ref === 3 || _ref === 4 || _ref === 5 || _ref === 6) {
			bitSize = (x$1 = v.typ.size, (((x$1 >>> 16 << 16) * 8 >>> 0) + (x$1 << 16 >>> 16) * 8) >>> 0);
			trunc = $shiftRightInt64(($shiftLeft64(x, ((64 - bitSize >>> 0)))), ((64 - bitSize >>> 0)));
			return !((x.high === trunc.high && x.low === trunc.low));
		}
		throw $panic(new ValueError.Ptr("reflect.Value.OverflowInt", k));
	};
	Value.prototype.OverflowInt = function(x) { return this.$val.OverflowInt(x); };
	Value.Ptr.prototype.OverflowUint = function(x) {
		var _struct, v, k, _ref, x$1, bitSize, trunc;
		v = (_struct = this, new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
		k = (new flag(v.flag)).kind();
		_ref = k;
		if (_ref === 7 || _ref === 12 || _ref === 8 || _ref === 9 || _ref === 10 || _ref === 11) {
			bitSize = (x$1 = v.typ.size, (((x$1 >>> 16 << 16) * 8 >>> 0) + (x$1 << 16 >>> 16) * 8) >>> 0);
			trunc = $shiftRightUint64(($shiftLeft64(x, ((64 - bitSize >>> 0)))), ((64 - bitSize >>> 0)));
			return !((x.high === trunc.high && x.low === trunc.low));
		}
		throw $panic(new ValueError.Ptr("reflect.Value.OverflowUint", k));
	};
	Value.prototype.OverflowUint = function(x) { return this.$val.OverflowUint(x); };
	Value.Ptr.prototype.Recv = function() {
		var x, ok, _struct, v, _tuple, _struct$1, _struct$2;
		x = new Value.Ptr();
		ok = false;
		v = (_struct = this, new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
		(new flag(v.flag)).mustBe(18);
		(new flag(v.flag)).mustBeExported();
		_tuple = v.recv(false); x = (_struct$1 = _tuple[0], new Value.Ptr(_struct$1.typ, _struct$1.val, _struct$1.flag)); ok = _tuple[1];
		return [(_struct$2 = x, new Value.Ptr(_struct$2.typ, _struct$2.val, _struct$2.flag)), ok];
	};
	Value.prototype.Recv = function() { return this.$val.Recv(); };
	Value.Ptr.prototype.recv = function(nb) {
		var val, ok, _struct, v, tt, _tuple, word, selected, typ, fl, _struct$1;
		val = new Value.Ptr();
		ok = false;
		v = (_struct = this, new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
		tt = v.typ.chanType;
		if (((tt.dir >> 0) & 1) === 0) {
			throw $panic(new $String("reflect: recv on send-only channel"));
		}
		_tuple = chanrecv(v.typ, v.iword(), nb); word = _tuple[0]; selected = _tuple[1]; ok = _tuple[2];
		if (selected) {
			typ = tt.elem;
			fl = (typ.Kind() >>> 0) << 4 >>> 0;
			if (typ.size > 4) {
				fl = (fl | 2) >>> 0;
			}
			val = new Value.Ptr(typ, word, fl);
		}
		return [(_struct$1 = val, new Value.Ptr(_struct$1.typ, _struct$1.val, _struct$1.flag)), ok];
	};
	Value.prototype.recv = function(nb) { return this.$val.recv(nb); };
	Value.Ptr.prototype.Send = function(x) {
		var _struct, v, _struct$1;
		v = (_struct = this, new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
		(new flag(v.flag)).mustBe(18);
		(new flag(v.flag)).mustBeExported();
		v.send((_struct$1 = x, new Value.Ptr(_struct$1.typ, _struct$1.val, _struct$1.flag)), false);
	};
	Value.prototype.Send = function(x) { return this.$val.Send(x); };
	Value.Ptr.prototype.send = function(x, nb) {
		var selected, _struct, v, tt, _struct$1;
		selected = false;
		v = (_struct = this, new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
		tt = v.typ.chanType;
		if (((tt.dir >> 0) & 2) === 0) {
			throw $panic(new $String("reflect: send on recv-only channel"));
		}
		(new flag(x.flag)).mustBeExported();
		x = (_struct$1 = x.assignTo("reflect.Value.Send", tt.elem, ($ptrType($emptyInterface)).nil), new Value.Ptr(_struct$1.typ, _struct$1.val, _struct$1.flag));
		selected = chansend(v.typ, v.iword(), x.iword(), nb);
		return selected;
	};
	Value.prototype.send = function(x, nb) { return this.$val.send(x, nb); };
	Value.Ptr.prototype.SetBool = function(x) {
		var _struct, v;
		v = (_struct = this, new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
		(new flag(v.flag)).mustBeAssignable();
		(new flag(v.flag)).mustBe(1);
		v.val.$set(x);
	};
	Value.prototype.SetBool = function(x) { return this.$val.SetBool(x); };
	Value.Ptr.prototype.SetBytes = function(x) {
		var _struct, v;
		v = (_struct = this, new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
		(new flag(v.flag)).mustBeAssignable();
		(new flag(v.flag)).mustBe(23);
		if (!((v.typ.Elem().Kind() === 8))) {
			throw $panic(new $String("reflect.Value.SetBytes of non-byte slice"));
		}
		v.val.$set(x);
	};
	Value.prototype.SetBytes = function(x) { return this.$val.SetBytes(x); };
	Value.Ptr.prototype.setRunes = function(x) {
		var _struct, v;
		v = (_struct = this, new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
		(new flag(v.flag)).mustBeAssignable();
		(new flag(v.flag)).mustBe(23);
		if (!((v.typ.Elem().Kind() === 5))) {
			throw $panic(new $String("reflect.Value.setRunes of non-rune slice"));
		}
		v.val.$set(x);
	};
	Value.prototype.setRunes = function(x) { return this.$val.setRunes(x); };
	Value.Ptr.prototype.SetComplex = function(x) {
		var _struct, v, k, _ref;
		v = (_struct = this, new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
		(new flag(v.flag)).mustBeAssignable();
		k = (new flag(v.flag)).kind();
		_ref = k;
		if (_ref === 15) {
			v.val.$set(new $Complex64(x.real, x.imag));
		} else if (_ref === 16) {
			v.val.$set(x);
		} else {
			throw $panic(new ValueError.Ptr("reflect.Value.SetComplex", k));
		}
	};
	Value.prototype.SetComplex = function(x) { return this.$val.SetComplex(x); };
	Value.Ptr.prototype.SetFloat = function(x) {
		var _struct, v, k, _ref;
		v = (_struct = this, new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
		(new flag(v.flag)).mustBeAssignable();
		k = (new flag(v.flag)).kind();
		_ref = k;
		if (_ref === 13) {
			v.val.$set(x);
		} else if (_ref === 14) {
			v.val.$set(x);
		} else {
			throw $panic(new ValueError.Ptr("reflect.Value.SetFloat", k));
		}
	};
	Value.prototype.SetFloat = function(x) { return this.$val.SetFloat(x); };
	Value.Ptr.prototype.SetInt = function(x) {
		var _struct, v, k, _ref;
		v = (_struct = this, new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
		(new flag(v.flag)).mustBeAssignable();
		k = (new flag(v.flag)).kind();
		_ref = k;
		if (_ref === 2) {
			v.val.$set(((x.low + ((x.high >> 31) * 4294967296)) >> 0));
		} else if (_ref === 3) {
			v.val.$set(((x.low + ((x.high >> 31) * 4294967296)) << 24 >> 24));
		} else if (_ref === 4) {
			v.val.$set(((x.low + ((x.high >> 31) * 4294967296)) << 16 >> 16));
		} else if (_ref === 5) {
			v.val.$set(((x.low + ((x.high >> 31) * 4294967296)) >> 0));
		} else if (_ref === 6) {
			v.val.$set(x);
		} else {
			throw $panic(new ValueError.Ptr("reflect.Value.SetInt", k));
		}
	};
	Value.prototype.SetInt = function(x) { return this.$val.SetInt(x); };
	Value.Ptr.prototype.SetMapIndex = function(key, val) {
		var _struct, v, tt, _struct$1, _struct$2;
		v = (_struct = this, new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
		(new flag(v.flag)).mustBe(21);
		(new flag(v.flag)).mustBeExported();
		(new flag(key.flag)).mustBeExported();
		tt = v.typ.mapType;
		key = (_struct$1 = key.assignTo("reflect.Value.SetMapIndex", tt.key, ($ptrType($emptyInterface)).nil), new Value.Ptr(_struct$1.typ, _struct$1.val, _struct$1.flag));
		if (!(val.typ === ($ptrType(rtype)).nil)) {
			(new flag(val.flag)).mustBeExported();
			val = (_struct$2 = val.assignTo("reflect.Value.SetMapIndex", tt.elem, ($ptrType($emptyInterface)).nil), new Value.Ptr(_struct$2.typ, _struct$2.val, _struct$2.flag));
		}
		mapassign(v.typ, v.iword(), key.iword(), val.iword(), !(val.typ === ($ptrType(rtype)).nil));
	};
	Value.prototype.SetMapIndex = function(key, val) { return this.$val.SetMapIndex(key, val); };
	Value.Ptr.prototype.SetUint = function(x) {
		var _struct, v, k, _ref;
		v = (_struct = this, new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
		(new flag(v.flag)).mustBeAssignable();
		k = (new flag(v.flag)).kind();
		_ref = k;
		if (_ref === 7) {
			v.val.$set((x.low >>> 0));
		} else if (_ref === 8) {
			v.val.$set((x.low << 24 >>> 24));
		} else if (_ref === 9) {
			v.val.$set((x.low << 16 >>> 16));
		} else if (_ref === 10) {
			v.val.$set((x.low >>> 0));
		} else if (_ref === 11) {
			v.val.$set(x);
		} else if (_ref === 12) {
			v.val.$set((x.low >>> 0));
		} else {
			throw $panic(new ValueError.Ptr("reflect.Value.SetUint", k));
		}
	};
	Value.prototype.SetUint = function(x) { return this.$val.SetUint(x); };
	Value.Ptr.prototype.SetPointer = function(x) {
		var _struct, v;
		v = (_struct = this, new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
		(new flag(v.flag)).mustBeAssignable();
		(new flag(v.flag)).mustBe(26);
		v.val.$set(x);
	};
	Value.prototype.SetPointer = function(x) { return this.$val.SetPointer(x); };
	Value.Ptr.prototype.SetString = function(x) {
		var _struct, v;
		v = (_struct = this, new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
		(new flag(v.flag)).mustBeAssignable();
		(new flag(v.flag)).mustBe(24);
		v.val.$set(x);
	};
	Value.prototype.SetString = function(x) { return this.$val.SetString(x); };
	Value.Ptr.prototype.String = function() {
		var _struct, v, k, _ref;
		v = (_struct = this, new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
		k = (new flag(v.flag)).kind();
		_ref = k;
		if (_ref === 0) {
			return "<invalid Value>";
		} else if (_ref === 24) {
			return v.val.$get();
		}
		return "<" + v.typ.String() + " Value>";
	};
	Value.prototype.String = function() { return this.$val.String(); };
	Value.Ptr.prototype.TryRecv = function() {
		var x, ok, _struct, v, _tuple, _struct$1, _struct$2;
		x = new Value.Ptr();
		ok = false;
		v = (_struct = this, new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
		(new flag(v.flag)).mustBe(18);
		(new flag(v.flag)).mustBeExported();
		_tuple = v.recv(true); x = (_struct$1 = _tuple[0], new Value.Ptr(_struct$1.typ, _struct$1.val, _struct$1.flag)); ok = _tuple[1];
		return [(_struct$2 = x, new Value.Ptr(_struct$2.typ, _struct$2.val, _struct$2.flag)), ok];
	};
	Value.prototype.TryRecv = function() { return this.$val.TryRecv(); };
	Value.Ptr.prototype.TrySend = function(x) {
		var _struct, v, _struct$1;
		v = (_struct = this, new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
		(new flag(v.flag)).mustBe(18);
		(new flag(v.flag)).mustBeExported();
		return v.send((_struct$1 = x, new Value.Ptr(_struct$1.typ, _struct$1.val, _struct$1.flag)), true);
	};
	Value.prototype.TrySend = function(x) { return this.$val.TrySend(x); };
	Value.Ptr.prototype.Type = function() {
		var _struct, v, f, i, tt, x, m, ut, x$1, m$1;
		v = (_struct = this, new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
		f = v.flag;
		if (f === 0) {
			throw $panic(new ValueError.Ptr("reflect.Value.Type", 0));
		}
		if (((f & 8) >>> 0) === 0) {
			return v.typ;
		}
		i = (v.flag >> 0) >> 9 >> 0;
		if (v.typ.Kind() === 20) {
			tt = v.typ.interfaceType;
			if (i < 0 || i >= tt.methods.length) {
				throw $panic(new $String("reflect: internal error: invalid method index"));
			}
			m = (x = tt.methods, ((i < 0 || i >= x.length) ? $throwRuntimeError("index out of range") : x.array[x.offset + i]));
			return m.typ;
		}
		ut = v.typ.uncommonType.uncommon();
		if (ut === ($ptrType(uncommonType)).nil || i < 0 || i >= ut.methods.length) {
			throw $panic(new $String("reflect: internal error: invalid method index"));
		}
		m$1 = (x$1 = ut.methods, ((i < 0 || i >= x$1.length) ? $throwRuntimeError("index out of range") : x$1.array[x$1.offset + i]));
		return m$1.mtyp;
	};
	Value.prototype.Type = function() { return this.$val.Type(); };
	Value.Ptr.prototype.Uint = function() {
		var _struct, v, k, p, v$1, _ref, x;
		v = (_struct = this, new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
		k = (new flag(v.flag)).kind();
		p = 0;
		if (!((((v.flag & 2) >>> 0) === 0))) {
			p = v.val;
		} else {
			p = new ($ptrType($UnsafePointer))(function() { return v.val; }, function(v$1) { v.val = v$1;; });
		}
		_ref = k;
		if (_ref === 7) {
			return new $Uint64(0, p.$get());
		} else if (_ref === 8) {
			return new $Uint64(0, p.$get());
		} else if (_ref === 9) {
			return new $Uint64(0, p.$get());
		} else if (_ref === 10) {
			return new $Uint64(0, p.$get());
		} else if (_ref === 11) {
			return p.$get();
		} else if (_ref === 12) {
			return (x = p.$get(), new $Uint64(0, x.constructor === Number ? x : 1));
		}
		throw $panic(new ValueError.Ptr("reflect.Value.Uint", k));
	};
	Value.prototype.Uint = function() { return this.$val.Uint(); };
	Value.Ptr.prototype.UnsafeAddr = function() {
		var _struct, v;
		v = (_struct = this, new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
		if (v.typ === ($ptrType(rtype)).nil) {
			throw $panic(new ValueError.Ptr("reflect.Value.UnsafeAddr", 0));
		}
		if (((v.flag & 4) >>> 0) === 0) {
			throw $panic(new $String("reflect.Value.UnsafeAddr of unaddressable value"));
		}
		return v.val;
	};
	Value.prototype.UnsafeAddr = function() { return this.$val.UnsafeAddr(); };
	typesMustMatch = function(what, t1, t2) {
		if (!($interfaceIsEqual(t1, t2))) {
			throw $panic(new $String(what + ": " + t1.String() + " != " + t2.String()));
		}
	};
	MakeMap = $pkg.MakeMap = function(typ) {
		var m;
		if (!((typ.Kind() === 21))) {
			throw $panic(new $String("reflect.MakeMap of non-map type"));
		}
		m = makemap((typ !== null && typ.constructor === ($ptrType(rtype)) ? typ.$val : $typeAssertionFailed(typ, ($ptrType(rtype)))));
		return new Value.Ptr(typ.common(), m, 336);
	};
	New = $pkg.New = function(typ) {
		var ptr, fl;
		if ($interfaceIsEqual(typ, null)) {
			throw $panic(new $String("reflect: New(nil)"));
		}
		ptr = unsafe_New((typ !== null && typ.constructor === ($ptrType(rtype)) ? typ.$val : $typeAssertionFailed(typ, ($ptrType(rtype)))));
		fl = 352;
		return new Value.Ptr(typ.common().ptrTo(), ptr, fl);
	};
	Value.Ptr.prototype.assignTo = function(context, dst, target) {
		var _struct, v, _struct$1, _struct$2, fl, _struct$3, x;
		v = (_struct = this, new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
		if (!((((v.flag & 8) >>> 0) === 0))) {
			v = (_struct$2 = makeMethodValue(context, (_struct$1 = v, new Value.Ptr(_struct$1.typ, _struct$1.val, _struct$1.flag))), new Value.Ptr(_struct$2.typ, _struct$2.val, _struct$2.flag));
		}
		if (directlyAssignable(dst, v.typ)) {
			v.typ = dst;
			fl = (v.flag & 7) >>> 0;
			fl = (fl | (((dst.Kind() >>> 0) << 4 >>> 0))) >>> 0;
			return new Value.Ptr(dst, v.val, fl);
		} else if (implements$1(dst, v.typ)) {
			if (target === ($ptrType($emptyInterface)).nil) {
				target = $newDataPointer(null, ($ptrType($emptyInterface)));
			}
			x = valueInterface((_struct$3 = v, new Value.Ptr(_struct$3.typ, _struct$3.val, _struct$3.flag)), false);
			if (dst.NumMethod() === 0) {
				target.$set(x);
			} else {
				ifaceE2I(dst, x, target);
			}
			return new Value.Ptr(dst, target, 322);
		}
		throw $panic(new $String(context + ": value of type " + v.typ.String() + " is not assignable to type " + dst.String()));
	};
	Value.prototype.assignTo = function(context, dst, target) { return this.$val.assignTo(context, dst, target); };
	Value.Ptr.prototype.Convert = function(t) {
		var _struct, v, _struct$1, _struct$2, op, _struct$3, _struct$4;
		v = (_struct = this, new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
		if (!((((v.flag & 8) >>> 0) === 0))) {
			v = (_struct$2 = makeMethodValue("Convert", (_struct$1 = v, new Value.Ptr(_struct$1.typ, _struct$1.val, _struct$1.flag))), new Value.Ptr(_struct$2.typ, _struct$2.val, _struct$2.flag));
		}
		op = convertOp(t.common(), v.typ);
		if (op === $throwNilPointerError) {
			throw $panic(new $String("reflect.Value.Convert: value of type " + v.typ.String() + " cannot be converted to type " + t.String()));
		}
		return (_struct$4 = op((_struct$3 = v, new Value.Ptr(_struct$3.typ, _struct$3.val, _struct$3.flag)), t), new Value.Ptr(_struct$4.typ, _struct$4.val, _struct$4.flag));
	};
	Value.prototype.Convert = function(t) { return this.$val.Convert(t); };
	convertOp = function(dst, src) {
		var _ref, _ref$1, _ref$2, _ref$3, _ref$4, _ref$5, _ref$6;
		_ref = src.Kind();
		if (_ref === 2 || _ref === 3 || _ref === 4 || _ref === 5 || _ref === 6) {
			_ref$1 = dst.Kind();
			if (_ref$1 === 2 || _ref$1 === 3 || _ref$1 === 4 || _ref$1 === 5 || _ref$1 === 6 || _ref$1 === 7 || _ref$1 === 8 || _ref$1 === 9 || _ref$1 === 10 || _ref$1 === 11 || _ref$1 === 12) {
				return cvtInt;
			} else if (_ref$1 === 13 || _ref$1 === 14) {
				return cvtIntFloat;
			} else if (_ref$1 === 24) {
				return cvtIntString;
			}
		} else if (_ref === 7 || _ref === 8 || _ref === 9 || _ref === 10 || _ref === 11 || _ref === 12) {
			_ref$2 = dst.Kind();
			if (_ref$2 === 2 || _ref$2 === 3 || _ref$2 === 4 || _ref$2 === 5 || _ref$2 === 6 || _ref$2 === 7 || _ref$2 === 8 || _ref$2 === 9 || _ref$2 === 10 || _ref$2 === 11 || _ref$2 === 12) {
				return cvtUint;
			} else if (_ref$2 === 13 || _ref$2 === 14) {
				return cvtUintFloat;
			} else if (_ref$2 === 24) {
				return cvtUintString;
			}
		} else if (_ref === 13 || _ref === 14) {
			_ref$3 = dst.Kind();
			if (_ref$3 === 2 || _ref$3 === 3 || _ref$3 === 4 || _ref$3 === 5 || _ref$3 === 6) {
				return cvtFloatInt;
			} else if (_ref$3 === 7 || _ref$3 === 8 || _ref$3 === 9 || _ref$3 === 10 || _ref$3 === 11 || _ref$3 === 12) {
				return cvtFloatUint;
			} else if (_ref$3 === 13 || _ref$3 === 14) {
				return cvtFloat;
			}
		} else if (_ref === 15 || _ref === 16) {
			_ref$4 = dst.Kind();
			if (_ref$4 === 15 || _ref$4 === 16) {
				return cvtComplex;
			}
		} else if (_ref === 24) {
			if ((dst.Kind() === 23) && dst.Elem().PkgPath() === "") {
				_ref$5 = dst.Elem().Kind();
				if (_ref$5 === 8) {
					return cvtStringBytes;
				} else if (_ref$5 === 5) {
					return cvtStringRunes;
				}
			}
		} else if (_ref === 23) {
			if ((dst.Kind() === 24) && src.Elem().PkgPath() === "") {
				_ref$6 = src.Elem().Kind();
				if (_ref$6 === 8) {
					return cvtBytesString;
				} else if (_ref$6 === 5) {
					return cvtRunesString;
				}
			}
		}
		if (haveIdenticalUnderlyingType(dst, src)) {
			return cvtDirect;
		}
		if ((dst.Kind() === 22) && dst.Name() === "" && (src.Kind() === 22) && src.Name() === "" && haveIdenticalUnderlyingType(dst.Elem().common(), src.Elem().common())) {
			return cvtDirect;
		}
		if (implements$1(dst, src)) {
			if (src.Kind() === 20) {
				return cvtI2I;
			}
			return cvtT2I;
		}
		return $throwNilPointerError;
	};
	makeFloat = function(f, v, t) {
		var typ, ptr, w, _ref, v$1, v$2;
		typ = t.common();
		if (typ.size > 4) {
			ptr = unsafe_New(typ);
			ptr.$set(v);
			return new Value.Ptr(typ, ptr, (((f | 2) >>> 0) | ((typ.Kind() >>> 0) << 4 >>> 0)) >>> 0);
		}
		w = 0;
		_ref = typ.size;
		if (_ref === 4) {
			new ($ptrType(iword))(function() { return w; }, function(v$1) { w = v$1;; }).$set(v);
		} else if (_ref === 8) {
			new ($ptrType(iword))(function() { return w; }, function(v$2) { w = v$2;; }).$set(v);
		}
		return new Value.Ptr(typ, w, (f | ((typ.Kind() >>> 0) << 4 >>> 0)) >>> 0);
	};
	makeComplex = function(f, v, t) {
		var typ, ptr, _ref, w, v$1;
		typ = t.common();
		if (typ.size > 4) {
			ptr = unsafe_New(typ);
			_ref = typ.size;
			if (_ref === 8) {
				ptr.$set(new $Complex64(v.real, v.imag));
			} else if (_ref === 16) {
				ptr.$set(v);
			}
			return new Value.Ptr(typ, ptr, (((f | 2) >>> 0) | ((typ.Kind() >>> 0) << 4 >>> 0)) >>> 0);
		}
		w = 0;
		new ($ptrType(iword))(function() { return w; }, function(v$1) { w = v$1;; }).$set(new $Complex64(v.real, v.imag));
		return new Value.Ptr(typ, w, (f | ((typ.Kind() >>> 0) << 4 >>> 0)) >>> 0);
	};
	makeString = function(f, v, t) {
		var _struct, ret, _struct$1;
		ret = (_struct = New(t).Elem(), new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
		ret.SetString(v);
		ret.flag = ((ret.flag & ~4) | f) >>> 0;
		return (_struct$1 = ret, new Value.Ptr(_struct$1.typ, _struct$1.val, _struct$1.flag));
	};
	makeBytes = function(f, v, t) {
		var _struct, ret, _struct$1;
		ret = (_struct = New(t).Elem(), new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
		ret.SetBytes(v);
		ret.flag = ((ret.flag & ~4) | f) >>> 0;
		return (_struct$1 = ret, new Value.Ptr(_struct$1.typ, _struct$1.val, _struct$1.flag));
	};
	makeRunes = function(f, v, t) {
		var _struct, ret, _struct$1;
		ret = (_struct = New(t).Elem(), new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
		ret.setRunes(v);
		ret.flag = ((ret.flag & ~4) | f) >>> 0;
		return (_struct$1 = ret, new Value.Ptr(_struct$1.typ, _struct$1.val, _struct$1.flag));
	};
	cvtInt = function(v, t) {
		var x, _struct;
		return (_struct = makeInt((v.flag & 1) >>> 0, (x = v.Int(), new $Uint64(x.high, x.low)), t), new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
	};
	cvtUint = function(v, t) {
		var _struct;
		return (_struct = makeInt((v.flag & 1) >>> 0, v.Uint(), t), new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
	};
	cvtFloatInt = function(v, t) {
		var x, _struct;
		return (_struct = makeInt((v.flag & 1) >>> 0, (x = new $Int64(0, v.Float()), new $Uint64(x.high, x.low)), t), new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
	};
	cvtFloatUint = function(v, t) {
		var _struct;
		return (_struct = makeInt((v.flag & 1) >>> 0, new $Uint64(0, v.Float()), t), new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
	};
	cvtIntFloat = function(v, t) {
		var _struct;
		return (_struct = makeFloat((v.flag & 1) >>> 0, $flatten64(v.Int()), t), new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
	};
	cvtUintFloat = function(v, t) {
		var _struct;
		return (_struct = makeFloat((v.flag & 1) >>> 0, $flatten64(v.Uint()), t), new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
	};
	cvtFloat = function(v, t) {
		var _struct;
		return (_struct = makeFloat((v.flag & 1) >>> 0, v.Float(), t), new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
	};
	cvtComplex = function(v, t) {
		var _struct;
		return (_struct = makeComplex((v.flag & 1) >>> 0, v.Complex(), t), new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
	};
	cvtIntString = function(v, t) {
		var _struct;
		return (_struct = makeString((v.flag & 1) >>> 0, $encodeRune(v.Int().low), t), new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
	};
	cvtUintString = function(v, t) {
		var _struct;
		return (_struct = makeString((v.flag & 1) >>> 0, $encodeRune(v.Uint().low), t), new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
	};
	cvtBytesString = function(v, t) {
		var _struct;
		return (_struct = makeString((v.flag & 1) >>> 0, $bytesToString(v.Bytes()), t), new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
	};
	cvtStringBytes = function(v, t) {
		var _struct;
		return (_struct = makeBytes((v.flag & 1) >>> 0, new ($sliceType($Uint8))($stringToBytes(v.String())), t), new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
	};
	cvtRunesString = function(v, t) {
		var _struct;
		return (_struct = makeString((v.flag & 1) >>> 0, $runesToString(v.runes()), t), new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
	};
	cvtStringRunes = function(v, t) {
		var _struct;
		return (_struct = makeRunes((v.flag & 1) >>> 0, new ($sliceType($Int32))($stringToRunes(v.String())), t), new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
	};
	cvtT2I = function(v, typ) {
		var target, _struct, x;
		target = $newDataPointer(null, ($ptrType($emptyInterface)));
		x = valueInterface((_struct = v, new Value.Ptr(_struct.typ, _struct.val, _struct.flag)), false);
		if (typ.NumMethod() === 0) {
			target.$set(x);
		} else {
			ifaceE2I((typ !== null && typ.constructor === ($ptrType(rtype)) ? typ.$val : $typeAssertionFailed(typ, ($ptrType(rtype)))), x, target);
		}
		return new Value.Ptr(typ.common(), target, (((((v.flag & 1) >>> 0) | 2) >>> 0) | 320) >>> 0);
	};
	cvtI2I = function(v, typ) {
		var _struct, ret, _struct$1, _struct$2, _struct$3;
		if (v.IsNil()) {
			ret = (_struct = Zero(typ), new Value.Ptr(_struct.typ, _struct.val, _struct.flag));
			ret.flag = (ret.flag | (((v.flag & 1) >>> 0))) >>> 0;
			return (_struct$1 = ret, new Value.Ptr(_struct$1.typ, _struct$1.val, _struct$1.flag));
		}
		return (_struct$3 = cvtT2I((_struct$2 = v.Elem(), new Value.Ptr(_struct$2.typ, _struct$2.val, _struct$2.flag)), typ), new Value.Ptr(_struct$3.typ, _struct$3.val, _struct$3.flag));
	};
	call = function() {
		throw $panic("Native function not implemented: call");
	};
	$pkg.init = function() {
		mapIter.init([["t", "t", "reflect", Type, ""], ["m", "m", "reflect", js.Object, ""], ["keys", "keys", "reflect", js.Object, ""], ["i", "i", "reflect", $Int, ""]]);
		Type.init([["Align", "Align", "", [], [$Int], false], ["AssignableTo", "AssignableTo", "", [Type], [$Bool], false], ["Bits", "Bits", "", [], [$Int], false], ["ChanDir", "ChanDir", "", [], [ChanDir], false], ["ConvertibleTo", "ConvertibleTo", "", [Type], [$Bool], false], ["Elem", "Elem", "", [], [Type], false], ["Field", "Field", "", [$Int], [StructField], false], ["FieldAlign", "FieldAlign", "", [], [$Int], false], ["FieldByIndex", "FieldByIndex", "", [($sliceType($Int))], [StructField], false], ["FieldByName", "FieldByName", "", [$String], [StructField, $Bool], false], ["FieldByNameFunc", "FieldByNameFunc", "", [($funcType([$String], [$Bool], false))], [StructField, $Bool], false], ["Implements", "Implements", "", [Type], [$Bool], false], ["In", "In", "", [$Int], [Type], false], ["IsVariadic", "IsVariadic", "", [], [$Bool], false], ["Key", "Key", "", [], [Type], false], ["Kind", "Kind", "", [], [Kind], false], ["Len", "Len", "", [], [$Int], false], ["Method", "Method", "", [$Int], [Method], false], ["MethodByName", "MethodByName", "", [$String], [Method, $Bool], false], ["Name", "Name", "", [], [$String], false], ["NumField", "NumField", "", [], [$Int], false], ["NumIn", "NumIn", "", [], [$Int], false], ["NumMethod", "NumMethod", "", [], [$Int], false], ["NumOut", "NumOut", "", [], [$Int], false], ["Out", "Out", "", [$Int], [Type], false], ["PkgPath", "PkgPath", "", [], [$String], false], ["Size", "Size", "", [], [$Uintptr], false], ["String", "String", "", [], [$String], false], ["common", "common", "reflect", [], [($ptrType(rtype))], false], ["uncommon", "uncommon", "reflect", [], [($ptrType(uncommonType))], false]]);
		Kind.methods = [["String", "String", "", [], [$String], false, -1]];
		($ptrType(Kind)).methods = [["String", "String", "", [], [$String], false, -1]];
		rtype.methods = [["uncommon", "uncommon", "reflect", [], [($ptrType(uncommonType))], false, 9]];
		($ptrType(rtype)).methods = [["Align", "Align", "", [], [$Int], false, -1], ["AssignableTo", "AssignableTo", "", [Type], [$Bool], false, -1], ["Bits", "Bits", "", [], [$Int], false, -1], ["ChanDir", "ChanDir", "", [], [ChanDir], false, -1], ["ConvertibleTo", "ConvertibleTo", "", [Type], [$Bool], false, -1], ["Elem", "Elem", "", [], [Type], false, -1], ["Field", "Field", "", [$Int], [StructField], false, -1], ["FieldAlign", "FieldAlign", "", [], [$Int], false, -1], ["FieldByIndex", "FieldByIndex", "", [($sliceType($Int))], [StructField], false, -1], ["FieldByName", "FieldByName", "", [$String], [StructField, $Bool], false, -1], ["FieldByNameFunc", "FieldByNameFunc", "", [($funcType([$String], [$Bool], false))], [StructField, $Bool], false, -1], ["Implements", "Implements", "", [Type], [$Bool], false, -1], ["In", "In", "", [$Int], [Type], false, -1], ["IsVariadic", "IsVariadic", "", [], [$Bool], false, -1], ["Key", "Key", "", [], [Type], false, -1], ["Kind", "Kind", "", [], [Kind], false, -1], ["Len", "Len", "", [], [$Int], false, -1], ["Method", "Method", "", [$Int], [Method], false, -1], ["MethodByName", "MethodByName", "", [$String], [Method, $Bool], false, -1], ["Name", "Name", "", [], [$String], false, -1], ["NumField", "NumField", "", [], [$Int], false, -1], ["NumIn", "NumIn", "", [], [$Int], false, -1], ["NumMethod", "NumMethod", "", [], [$Int], false, -1], ["NumOut", "NumOut", "", [], [$Int], false, -1], ["Out", "Out", "", [$Int], [Type], false, -1], ["PkgPath", "PkgPath", "", [], [$String], false, -1], ["Size", "Size", "", [], [$Uintptr], false, -1], ["String", "String", "", [], [$String], false, -1], ["common", "common", "reflect", [], [($ptrType(rtype))], false, -1], ["ptrTo", "ptrTo", "reflect", [], [($ptrType(rtype))], false, -1], ["uncommon", "uncommon", "reflect", [], [($ptrType(uncommonType))], false, 9]];
		rtype.init([["size", "size", "reflect", $Uintptr, ""], ["hash", "hash", "reflect", $Uint32, ""], ["_$2", "_", "reflect", $Uint8, ""], ["align", "align", "reflect", $Uint8, ""], ["fieldAlign", "fieldAlign", "reflect", $Uint8, ""], ["kind", "kind", "reflect", $Uint8, ""], ["alg", "alg", "reflect", ($ptrType($Uintptr)), ""], ["gc", "gc", "reflect", $UnsafePointer, ""], ["string", "string", "reflect", ($ptrType($String)), ""], ["uncommonType", "", "reflect", ($ptrType(uncommonType)), ""], ["ptrToThis", "ptrToThis", "reflect", ($ptrType(rtype)), ""]]);
		method.init([["name", "name", "reflect", ($ptrType($String)), ""], ["pkgPath", "pkgPath", "reflect", ($ptrType($String)), ""], ["mtyp", "mtyp", "reflect", ($ptrType(rtype)), ""], ["typ", "typ", "reflect", ($ptrType(rtype)), ""], ["ifn", "ifn", "reflect", $UnsafePointer, ""], ["tfn", "tfn", "reflect", $UnsafePointer, ""]]);
		($ptrType(uncommonType)).methods = [["Method", "Method", "", [$Int], [Method], false, -1], ["MethodByName", "MethodByName", "", [$String], [Method, $Bool], false, -1], ["Name", "Name", "", [], [$String], false, -1], ["NumMethod", "NumMethod", "", [], [$Int], false, -1], ["PkgPath", "PkgPath", "", [], [$String], false, -1], ["uncommon", "uncommon", "reflect", [], [($ptrType(uncommonType))], false, -1]];
		uncommonType.init([["name", "name", "reflect", ($ptrType($String)), ""], ["pkgPath", "pkgPath", "reflect", ($ptrType($String)), ""], ["methods", "methods", "reflect", ($sliceType(method)), ""]]);
		ChanDir.methods = [["String", "String", "", [], [$String], false, -1]];
		($ptrType(ChanDir)).methods = [["String", "String", "", [], [$String], false, -1]];
		arrayType.methods = [["uncommon", "uncommon", "reflect", [], [($ptrType(uncommonType))], false, 0]];
		($ptrType(arrayType)).methods = [["Align", "Align", "", [], [$Int], false, 0], ["AssignableTo", "AssignableTo", "", [Type], [$Bool], false, 0], ["Bits", "Bits", "", [], [$Int], false, 0], ["ChanDir", "ChanDir", "", [], [ChanDir], false, 0], ["ConvertibleTo", "ConvertibleTo", "", [Type], [$Bool], false, 0], ["Elem", "Elem", "", [], [Type], false, 0], ["Field", "Field", "", [$Int], [StructField], false, 0], ["FieldAlign", "FieldAlign", "", [], [$Int], false, 0], ["FieldByIndex", "FieldByIndex", "", [($sliceType($Int))], [StructField], false, 0], ["FieldByName", "FieldByName", "", [$String], [StructField, $Bool], false, 0], ["FieldByNameFunc", "FieldByNameFunc", "", [($funcType([$String], [$Bool], false))], [StructField, $Bool], false, 0], ["Implements", "Implements", "", [Type], [$Bool], false, 0], ["In", "In", "", [$Int], [Type], false, 0], ["IsVariadic", "IsVariadic", "", [], [$Bool], false, 0], ["Key", "Key", "", [], [Type], false, 0], ["Kind", "Kind", "", [], [Kind], false, 0], ["Len", "Len", "", [], [$Int], false, 0], ["Method", "Method", "", [$Int], [Method], false, 0], ["MethodByName", "MethodByName", "", [$String], [Method, $Bool], false, 0], ["Name", "Name", "", [], [$String], false, 0], ["NumField", "NumField", "", [], [$Int], false, 0], ["NumIn", "NumIn", "", [], [$Int], false, 0], ["NumMethod", "NumMethod", "", [], [$Int], false, 0], ["NumOut", "NumOut", "", [], [$Int], false, 0], ["Out", "Out", "", [$Int], [Type], false, 0], ["PkgPath", "PkgPath", "", [], [$String], false, 0], ["Size", "Size", "", [], [$Uintptr], false, 0], ["String", "String", "", [], [$String], false, 0], ["common", "common", "reflect", [], [($ptrType(rtype))], false, 0], ["ptrTo", "ptrTo", "reflect", [], [($ptrType(rtype))], false, 0], ["uncommon", "uncommon", "reflect", [], [($ptrType(uncommonType))], false, 0]];
		arrayType.init([["rtype", "", "reflect", rtype, "reflect:\"array\""], ["elem", "elem", "reflect", ($ptrType(rtype)), ""], ["slice", "slice", "reflect", ($ptrType(rtype)), ""], ["len", "len", "reflect", $Uintptr, ""]]);
		chanType.methods = [["uncommon", "uncommon", "reflect", [], [($ptrType(uncommonType))], false, 0]];
		($ptrType(chanType)).methods = [["Align", "Align", "", [], [$Int], false, 0], ["AssignableTo", "AssignableTo", "", [Type], [$Bool], false, 0], ["Bits", "Bits", "", [], [$Int], false, 0], ["ChanDir", "ChanDir", "", [], [ChanDir], false, 0], ["ConvertibleTo", "ConvertibleTo", "", [Type], [$Bool], false, 0], ["Elem", "Elem", "", [], [Type], false, 0], ["Field", "Field", "", [$Int], [StructField], false, 0], ["FieldAlign", "FieldAlign", "", [], [$Int], false, 0], ["FieldByIndex", "FieldByIndex", "", [($sliceType($Int))], [StructField], false, 0], ["FieldByName", "FieldByName", "", [$String], [StructField, $Bool], false, 0], ["FieldByNameFunc", "FieldByNameFunc", "", [($funcType([$String], [$Bool], false))], [StructField, $Bool], false, 0], ["Implements", "Implements", "", [Type], [$Bool], false, 0], ["In", "In", "", [$Int], [Type], false, 0], ["IsVariadic", "IsVariadic", "", [], [$Bool], false, 0], ["Key", "Key", "", [], [Type], false, 0], ["Kind", "Kind", "", [], [Kind], false, 0], ["Len", "Len", "", [], [$Int], false, 0], ["Method", "Method", "", [$Int], [Method], false, 0], ["MethodByName", "MethodByName", "", [$String], [Method, $Bool], false, 0], ["Name", "Name", "", [], [$String], false, 0], ["NumField", "NumField", "", [], [$Int], false, 0], ["NumIn", "NumIn", "", [], [$Int], false, 0], ["NumMethod", "NumMethod", "", [], [$Int], false, 0], ["NumOut", "NumOut", "", [], [$Int], false, 0], ["Out", "Out", "", [$Int], [Type], false, 0], ["PkgPath", "PkgPath", "", [], [$String], false, 0], ["Size", "Size", "", [], [$Uintptr], false, 0], ["String", "String", "", [], [$String], false, 0], ["common", "common", "reflect", [], [($ptrType(rtype))], false, 0], ["ptrTo", "ptrTo", "reflect", [], [($ptrType(rtype))], false, 0], ["uncommon", "uncommon", "reflect", [], [($ptrType(uncommonType))], false, 0]];
		chanType.init([["rtype", "", "reflect", rtype, "reflect:\"chan\""], ["elem", "elem", "reflect", ($ptrType(rtype)), ""], ["dir", "dir", "reflect", $Uintptr, ""]]);
		funcType.methods = [["uncommon", "uncommon", "reflect", [], [($ptrType(uncommonType))], false, 0]];
		($ptrType(funcType)).methods = [["Align", "Align", "", [], [$Int], false, 0], ["AssignableTo", "AssignableTo", "", [Type], [$Bool], false, 0], ["Bits", "Bits", "", [], [$Int], false, 0], ["ChanDir", "ChanDir", "", [], [ChanDir], false, 0], ["ConvertibleTo", "ConvertibleTo", "", [Type], [$Bool], false, 0], ["Elem", "Elem", "", [], [Type], false, 0], ["Field", "Field", "", [$Int], [StructField], false, 0], ["FieldAlign", "FieldAlign", "", [], [$Int], false, 0], ["FieldByIndex", "FieldByIndex", "", [($sliceType($Int))], [StructField], false, 0], ["FieldByName", "FieldByName", "", [$String], [StructField, $Bool], false, 0], ["FieldByNameFunc", "FieldByNameFunc", "", [($funcType([$String], [$Bool], false))], [StructField, $Bool], false, 0], ["Implements", "Implements", "", [Type], [$Bool], false, 0], ["In", "In", "", [$Int], [Type], false, 0], ["IsVariadic", "IsVariadic", "", [], [$Bool], false, 0], ["Key", "Key", "", [], [Type], false, 0], ["Kind", "Kind", "", [], [Kind], false, 0], ["Len", "Len", "", [], [$Int], false, 0], ["Method", "Method", "", [$Int], [Method], false, 0], ["MethodByName", "MethodByName", "", [$String], [Method, $Bool], false, 0], ["Name", "Name", "", [], [$String], false, 0], ["NumField", "NumField", "", [], [$Int], false, 0], ["NumIn", "NumIn", "", [], [$Int], false, 0], ["NumMethod", "NumMethod", "", [], [$Int], false, 0], ["NumOut", "NumOut", "", [], [$Int], false, 0], ["Out", "Out", "", [$Int], [Type], false, 0], ["PkgPath", "PkgPath", "", [], [$String], false, 0], ["Size", "Size", "", [], [$Uintptr], false, 0], ["String", "String", "", [], [$String], false, 0], ["common", "common", "reflect", [], [($ptrType(rtype))], false, 0], ["ptrTo", "ptrTo", "reflect", [], [($ptrType(rtype))], false, 0], ["uncommon", "uncommon", "reflect", [], [($ptrType(uncommonType))], false, 0]];
		funcType.init([["rtype", "", "reflect", rtype, "reflect:\"func\""], ["dotdotdot", "dotdotdot", "reflect", $Bool, ""], ["in$2", "in", "reflect", ($sliceType(($ptrType(rtype)))), ""], ["out", "out", "reflect", ($sliceType(($ptrType(rtype)))), ""]]);
		imethod.init([["name", "name", "reflect", ($ptrType($String)), ""], ["pkgPath", "pkgPath", "reflect", ($ptrType($String)), ""], ["typ", "typ", "reflect", ($ptrType(rtype)), ""]]);
		interfaceType.methods = [["uncommon", "uncommon", "reflect", [], [($ptrType(uncommonType))], false, 0]];
		($ptrType(interfaceType)).methods = [["Align", "Align", "", [], [$Int], false, 0], ["AssignableTo", "AssignableTo", "", [Type], [$Bool], false, 0], ["Bits", "Bits", "", [], [$Int], false, 0], ["ChanDir", "ChanDir", "", [], [ChanDir], false, 0], ["ConvertibleTo", "ConvertibleTo", "", [Type], [$Bool], false, 0], ["Elem", "Elem", "", [], [Type], false, 0], ["Field", "Field", "", [$Int], [StructField], false, 0], ["FieldAlign", "FieldAlign", "", [], [$Int], false, 0], ["FieldByIndex", "FieldByIndex", "", [($sliceType($Int))], [StructField], false, 0], ["FieldByName", "FieldByName", "", [$String], [StructField, $Bool], false, 0], ["FieldByNameFunc", "FieldByNameFunc", "", [($funcType([$String], [$Bool], false))], [StructField, $Bool], false, 0], ["Implements", "Implements", "", [Type], [$Bool], false, 0], ["In", "In", "", [$Int], [Type], false, 0], ["IsVariadic", "IsVariadic", "", [], [$Bool], false, 0], ["Key", "Key", "", [], [Type], false, 0], ["Kind", "Kind", "", [], [Kind], false, 0], ["Len", "Len", "", [], [$Int], false, 0], ["Method", "Method", "", [$Int], [Method], false, -1], ["MethodByName", "MethodByName", "", [$String], [Method, $Bool], false, -1], ["Name", "Name", "", [], [$String], false, 0], ["NumField", "NumField", "", [], [$Int], false, 0], ["NumIn", "NumIn", "", [], [$Int], false, 0], ["NumMethod", "NumMethod", "", [], [$Int], false, -1], ["NumOut", "NumOut", "", [], [$Int], false, 0], ["Out", "Out", "", [$Int], [Type], false, 0], ["PkgPath", "PkgPath", "", [], [$String], false, 0], ["Size", "Size", "", [], [$Uintptr], false, 0], ["String", "String", "", [], [$String], false, 0], ["common", "common", "reflect", [], [($ptrType(rtype))], false, 0], ["ptrTo", "ptrTo", "reflect", [], [($ptrType(rtype))], false, 0], ["uncommon", "uncommon", "reflect", [], [($ptrType(uncommonType))], false, 0]];
		interfaceType.init([["rtype", "", "reflect", rtype, "reflect:\"interface\""], ["methods", "methods", "reflect", ($sliceType(imethod)), ""]]);
		mapType.methods = [["uncommon", "uncommon", "reflect", [], [($ptrType(uncommonType))], false, 0]];
		($ptrType(mapType)).methods = [["Align", "Align", "", [], [$Int], false, 0], ["AssignableTo", "AssignableTo", "", [Type], [$Bool], false, 0], ["Bits", "Bits", "", [], [$Int], false, 0], ["ChanDir", "ChanDir", "", [], [ChanDir], false, 0], ["ConvertibleTo", "ConvertibleTo", "", [Type], [$Bool], false, 0], ["Elem", "Elem", "", [], [Type], false, 0], ["Field", "Field", "", [$Int], [StructField], false, 0], ["FieldAlign", "FieldAlign", "", [], [$Int], false, 0], ["FieldByIndex", "FieldByIndex", "", [($sliceType($Int))], [StructField], false, 0], ["FieldByName", "FieldByName", "", [$String], [StructField, $Bool], false, 0], ["FieldByNameFunc", "FieldByNameFunc", "", [($funcType([$String], [$Bool], false))], [StructField, $Bool], false, 0], ["Implements", "Implements", "", [Type], [$Bool], false, 0], ["In", "In", "", [$Int], [Type], false, 0], ["IsVariadic", "IsVariadic", "", [], [$Bool], false, 0], ["Key", "Key", "", [], [Type], false, 0], ["Kind", "Kind", "", [], [Kind], false, 0], ["Len", "Len", "", [], [$Int], false, 0], ["Method", "Method", "", [$Int], [Method], false, 0], ["MethodByName", "MethodByName", "", [$String], [Method, $Bool], false, 0], ["Name", "Name", "", [], [$String], false, 0], ["NumField", "NumField", "", [], [$Int], false, 0], ["NumIn", "NumIn", "", [], [$Int], false, 0], ["NumMethod", "NumMethod", "", [], [$Int], false, 0], ["NumOut", "NumOut", "", [], [$Int], false, 0], ["Out", "Out", "", [$Int], [Type], false, 0], ["PkgPath", "PkgPath", "", [], [$String], false, 0], ["Size", "Size", "", [], [$Uintptr], false, 0], ["String", "String", "", [], [$String], false, 0], ["common", "common", "reflect", [], [($ptrType(rtype))], false, 0], ["ptrTo", "ptrTo", "reflect", [], [($ptrType(rtype))], false, 0], ["uncommon", "uncommon", "reflect", [], [($ptrType(uncommonType))], false, 0]];
		mapType.init([["rtype", "", "reflect", rtype, "reflect:\"map\""], ["key", "key", "reflect", ($ptrType(rtype)), ""], ["elem", "elem", "reflect", ($ptrType(rtype)), ""], ["bucket", "bucket", "reflect", ($ptrType(rtype)), ""], ["hmap", "hmap", "reflect", ($ptrType(rtype)), ""]]);
		ptrType.methods = [["uncommon", "uncommon", "reflect", [], [($ptrType(uncommonType))], false, 0]];
		($ptrType(ptrType)).methods = [["Align", "Align", "", [], [$Int], false, 0], ["AssignableTo", "AssignableTo", "", [Type], [$Bool], false, 0], ["Bits", "Bits", "", [], [$Int], false, 0], ["ChanDir", "ChanDir", "", [], [ChanDir], false, 0], ["ConvertibleTo", "ConvertibleTo", "", [Type], [$Bool], false, 0], ["Elem", "Elem", "", [], [Type], false, 0], ["Field", "Field", "", [$Int], [StructField], false, 0], ["FieldAlign", "FieldAlign", "", [], [$Int], false, 0], ["FieldByIndex", "FieldByIndex", "", [($sliceType($Int))], [StructField], false, 0], ["FieldByName", "FieldByName", "", [$String], [StructField, $Bool], false, 0], ["FieldByNameFunc", "FieldByNameFunc", "", [($funcType([$String], [$Bool], false))], [StructField, $Bool], false, 0], ["Implements", "Implements", "", [Type], [$Bool], false, 0], ["In", "In", "", [$Int], [Type], false, 0], ["IsVariadic", "IsVariadic", "", [], [$Bool], false, 0], ["Key", "Key", "", [], [Type], false, 0], ["Kind", "Kind", "", [], [Kind], false, 0], ["Len", "Len", "", [], [$Int], false, 0], ["Method", "Method", "", [$Int], [Method], false, 0], ["MethodByName", "MethodByName", "", [$String], [Method, $Bool], false, 0], ["Name", "Name", "", [], [$String], false, 0], ["NumField", "NumField", "", [], [$Int], false, 0], ["NumIn", "NumIn", "", [], [$Int], false, 0], ["NumMethod", "NumMethod", "", [], [$Int], false, 0], ["NumOut", "NumOut", "", [], [$Int], false, 0], ["Out", "Out", "", [$Int], [Type], false, 0], ["PkgPath", "PkgPath", "", [], [$String], false, 0], ["Size", "Size", "", [], [$Uintptr], false, 0], ["String", "String", "", [], [$String], false, 0], ["common", "common", "reflect", [], [($ptrType(rtype))], false, 0], ["ptrTo", "ptrTo", "reflect", [], [($ptrType(rtype))], false, 0], ["uncommon", "uncommon", "reflect", [], [($ptrType(uncommonType))], false, 0]];
		ptrType.init([["rtype", "", "reflect", rtype, "reflect:\"ptr\""], ["elem", "elem", "reflect", ($ptrType(rtype)), ""]]);
		sliceType.methods = [["uncommon", "uncommon", "reflect", [], [($ptrType(uncommonType))], false, 0]];
		($ptrType(sliceType)).methods = [["Align", "Align", "", [], [$Int], false, 0], ["AssignableTo", "AssignableTo", "", [Type], [$Bool], false, 0], ["Bits", "Bits", "", [], [$Int], false, 0], ["ChanDir", "ChanDir", "", [], [ChanDir], false, 0], ["ConvertibleTo", "ConvertibleTo", "", [Type], [$Bool], false, 0], ["Elem", "Elem", "", [], [Type], false, 0], ["Field", "Field", "", [$Int], [StructField], false, 0], ["FieldAlign", "FieldAlign", "", [], [$Int], false, 0], ["FieldByIndex", "FieldByIndex", "", [($sliceType($Int))], [StructField], false, 0], ["FieldByName", "FieldByName", "", [$String], [StructField, $Bool], false, 0], ["FieldByNameFunc", "FieldByNameFunc", "", [($funcType([$String], [$Bool], false))], [StructField, $Bool], false, 0], ["Implements", "Implements", "", [Type], [$Bool], false, 0], ["In", "In", "", [$Int], [Type], false, 0], ["IsVariadic", "IsVariadic", "", [], [$Bool], false, 0], ["Key", "Key", "", [], [Type], false, 0], ["Kind", "Kind", "", [], [Kind], false, 0], ["Len", "Len", "", [], [$Int], false, 0], ["Method", "Method", "", [$Int], [Method], false, 0], ["MethodByName", "MethodByName", "", [$String], [Method, $Bool], false, 0], ["Name", "Name", "", [], [$String], false, 0], ["NumField", "NumField", "", [], [$Int], false, 0], ["NumIn", "NumIn", "", [], [$Int], false, 0], ["NumMethod", "NumMethod", "", [], [$Int], false, 0], ["NumOut", "NumOut", "", [], [$Int], false, 0], ["Out", "Out", "", [$Int], [Type], false, 0], ["PkgPath", "PkgPath", "", [], [$String], false, 0], ["Size", "Size", "", [], [$Uintptr], false, 0], ["String", "String", "", [], [$String], false, 0], ["common", "common", "reflect", [], [($ptrType(rtype))], false, 0], ["ptrTo", "ptrTo", "reflect", [], [($ptrType(rtype))], false, 0], ["uncommon", "uncommon", "reflect", [], [($ptrType(uncommonType))], false, 0]];
		sliceType.init([["rtype", "", "reflect", rtype, "reflect:\"slice\""], ["elem", "elem", "reflect", ($ptrType(rtype)), ""]]);
		structField.init([["name", "name", "reflect", ($ptrType($String)), ""], ["pkgPath", "pkgPath", "reflect", ($ptrType($String)), ""], ["typ", "typ", "reflect", ($ptrType(rtype)), ""], ["tag", "tag", "reflect", ($ptrType($String)), ""], ["offset", "offset", "reflect", $Uintptr, ""]]);
		structType.methods = [["uncommon", "uncommon", "reflect", [], [($ptrType(uncommonType))], false, 0]];
		($ptrType(structType)).methods = [["Align", "Align", "", [], [$Int], false, 0], ["AssignableTo", "AssignableTo", "", [Type], [$Bool], false, 0], ["Bits", "Bits", "", [], [$Int], false, 0], ["ChanDir", "ChanDir", "", [], [ChanDir], false, 0], ["ConvertibleTo", "ConvertibleTo", "", [Type], [$Bool], false, 0], ["Elem", "Elem", "", [], [Type], false, 0], ["Field", "Field", "", [$Int], [StructField], false, -1], ["FieldAlign", "FieldAlign", "", [], [$Int], false, 0], ["FieldByIndex", "FieldByIndex", "", [($sliceType($Int))], [StructField], false, -1], ["FieldByName", "FieldByName", "", [$String], [StructField, $Bool], false, -1], ["FieldByNameFunc", "FieldByNameFunc", "", [($funcType([$String], [$Bool], false))], [StructField, $Bool], false, -1], ["Implements", "Implements", "", [Type], [$Bool], false, 0], ["In", "In", "", [$Int], [Type], false, 0], ["IsVariadic", "IsVariadic", "", [], [$Bool], false, 0], ["Key", "Key", "", [], [Type], false, 0], ["Kind", "Kind", "", [], [Kind], false, 0], ["Len", "Len", "", [], [$Int], false, 0], ["Method", "Method", "", [$Int], [Method], false, 0], ["MethodByName", "MethodByName", "", [$String], [Method, $Bool], false, 0], ["Name", "Name", "", [], [$String], false, 0], ["NumField", "NumField", "", [], [$Int], false, 0], ["NumIn", "NumIn", "", [], [$Int], false, 0], ["NumMethod", "NumMethod", "", [], [$Int], false, 0], ["NumOut", "NumOut", "", [], [$Int], false, 0], ["Out", "Out", "", [$Int], [Type], false, 0], ["PkgPath", "PkgPath", "", [], [$String], false, 0], ["Size", "Size", "", [], [$Uintptr], false, 0], ["String", "String", "", [], [$String], false, 0], ["common", "common", "reflect", [], [($ptrType(rtype))], false, 0], ["ptrTo", "ptrTo", "reflect", [], [($ptrType(rtype))], false, 0], ["uncommon", "uncommon", "reflect", [], [($ptrType(uncommonType))], false, 0]];
		structType.init([["rtype", "", "reflect", rtype, "reflect:\"struct\""], ["fields", "fields", "reflect", ($sliceType(structField)), ""]]);
		Method.init([["Name", "Name", "", $String, ""], ["PkgPath", "PkgPath", "", $String, ""], ["Type", "Type", "", Type, ""], ["Func", "Func", "", Value, ""], ["Index", "Index", "", $Int, ""]]);
		StructField.init([["Name", "Name", "", $String, ""], ["PkgPath", "PkgPath", "", $String, ""], ["Type", "Type", "", Type, ""], ["Tag", "Tag", "", StructTag, ""], ["Offset", "Offset", "", $Uintptr, ""], ["Index", "Index", "", ($sliceType($Int)), ""], ["Anonymous", "Anonymous", "", $Bool, ""]]);
		StructTag.methods = [["Get", "Get", "", [$String], [$String], false, -1]];
		($ptrType(StructTag)).methods = [["Get", "Get", "", [$String], [$String], false, -1]];
		fieldScan.init([["typ", "typ", "reflect", ($ptrType(structType)), ""], ["index", "index", "reflect", ($sliceType($Int)), ""]]);
		Value.methods = [["Addr", "Addr", "", [], [Value], false, -1], ["Bool", "Bool", "", [], [$Bool], false, -1], ["Bytes", "Bytes", "", [], [($sliceType($Uint8))], false, -1], ["Call", "Call", "", [($sliceType(Value))], [($sliceType(Value))], false, -1], ["CallSlice", "CallSlice", "", [($sliceType(Value))], [($sliceType(Value))], false, -1], ["CanAddr", "CanAddr", "", [], [$Bool], false, -1], ["CanInterface", "CanInterface", "", [], [$Bool], false, -1], ["CanSet", "CanSet", "", [], [$Bool], false, -1], ["Cap", "Cap", "", [], [$Int], false, -1], ["Close", "Close", "", [], [], false, -1], ["Complex", "Complex", "", [], [$Complex128], false, -1], ["Convert", "Convert", "", [Type], [Value], false, -1], ["Elem", "Elem", "", [], [Value], false, -1], ["Field", "Field", "", [$Int], [Value], false, -1], ["FieldByIndex", "FieldByIndex", "", [($sliceType($Int))], [Value], false, -1], ["FieldByName", "FieldByName", "", [$String], [Value], false, -1], ["FieldByNameFunc", "FieldByNameFunc", "", [($funcType([$String], [$Bool], false))], [Value], false, -1], ["Float", "Float", "", [], [$Float64], false, -1], ["Index", "Index", "", [$Int], [Value], false, -1], ["Int", "Int", "", [], [$Int64], false, -1], ["Interface", "Interface", "", [], [$emptyInterface], false, -1], ["InterfaceData", "InterfaceData", "", [], [($arrayType($Uintptr, 2))], false, -1], ["IsNil", "IsNil", "", [], [$Bool], false, -1], ["IsValid", "IsValid", "", [], [$Bool], false, -1], ["Kind", "Kind", "", [], [Kind], false, -1], ["Len", "Len", "", [], [$Int], false, -1], ["MapIndex", "MapIndex", "", [Value], [Value], false, -1], ["MapKeys", "MapKeys", "", [], [($sliceType(Value))], false, -1], ["Method", "Method", "", [$Int], [Value], false, -1], ["MethodByName", "MethodByName", "", [$String], [Value], false, -1], ["NumField", "NumField", "", [], [$Int], false, -1], ["NumMethod", "NumMethod", "", [], [$Int], false, -1], ["OverflowComplex", "OverflowComplex", "", [$Complex128], [$Bool], false, -1], ["OverflowFloat", "OverflowFloat", "", [$Float64], [$Bool], false, -1], ["OverflowInt", "OverflowInt", "", [$Int64], [$Bool], false, -1], ["OverflowUint", "OverflowUint", "", [$Uint64], [$Bool], false, -1], ["Pointer", "Pointer", "", [], [$Uintptr], false, -1], ["Recv", "Recv", "", [], [Value, $Bool], false, -1], ["Send", "Send", "", [Value], [], false, -1], ["Set", "Set", "", [Value], [], false, -1], ["SetBool", "SetBool", "", [$Bool], [], false, -1], ["SetBytes", "SetBytes", "", [($sliceType($Uint8))], [], false, -1], ["SetCap", "SetCap", "", [$Int], [], false, -1], ["SetComplex", "SetComplex", "", [$Complex128], [], false, -1], ["SetFloat", "SetFloat", "", [$Float64], [], false, -1], ["SetInt", "SetInt", "", [$Int64], [], false, -1], ["SetLen", "SetLen", "", [$Int], [], false, -1], ["SetMapIndex", "SetMapIndex", "", [Value, Value], [], false, -1], ["SetPointer", "SetPointer", "", [$UnsafePointer], [], false, -1], ["SetString", "SetString", "", [$String], [], false, -1], ["SetUint", "SetUint", "", [$Uint64], [], false, -1], ["Slice", "Slice", "", [$Int, $Int], [Value], false, -1], ["Slice3", "Slice3", "", [$Int, $Int, $Int], [Value], false, -1], ["String", "String", "", [], [$String], false, -1], ["TryRecv", "TryRecv", "", [], [Value, $Bool], false, -1], ["TrySend", "TrySend", "", [Value], [$Bool], false, -1], ["Type", "Type", "", [], [Type], false, -1], ["Uint", "Uint", "", [], [$Uint64], false, -1], ["UnsafeAddr", "UnsafeAddr", "", [], [$Uintptr], false, -1], ["assignTo", "assignTo", "reflect", [$String, ($ptrType(rtype)), ($ptrType($emptyInterface))], [Value], false, -1], ["call", "call", "reflect", [$String, ($sliceType(Value))], [($sliceType(Value))], false, -1], ["iword", "iword", "reflect", [], [iword], false, -1], ["kind", "kind", "reflect", [], [Kind], false, 2], ["mustBe", "mustBe", "reflect", [Kind], [], false, 2], ["mustBeAssignable", "mustBeAssignable", "reflect", [], [], false, 2], ["mustBeExported", "mustBeExported", "reflect", [], [], false, 2], ["recv", "recv", "reflect", [$Bool], [Value, $Bool], false, -1], ["runes", "runes", "reflect", [], [($sliceType($Int32))], false, -1], ["send", "send", "reflect", [Value, $Bool], [$Bool], false, -1], ["setRunes", "setRunes", "reflect", [($sliceType($Int32))], [], false, -1]];
		($ptrType(Value)).methods = [["Addr", "Addr", "", [], [Value], false, -1], ["Bool", "Bool", "", [], [$Bool], false, -1], ["Bytes", "Bytes", "", [], [($sliceType($Uint8))], false, -1], ["Call", "Call", "", [($sliceType(Value))], [($sliceType(Value))], false, -1], ["CallSlice", "CallSlice", "", [($sliceType(Value))], [($sliceType(Value))], false, -1], ["CanAddr", "CanAddr", "", [], [$Bool], false, -1], ["CanInterface", "CanInterface", "", [], [$Bool], false, -1], ["CanSet", "CanSet", "", [], [$Bool], false, -1], ["Cap", "Cap", "", [], [$Int], false, -1], ["Close", "Close", "", [], [], false, -1], ["Complex", "Complex", "", [], [$Complex128], false, -1], ["Convert", "Convert", "", [Type], [Value], false, -1], ["Elem", "Elem", "", [], [Value], false, -1], ["Field", "Field", "", [$Int], [Value], false, -1], ["FieldByIndex", "FieldByIndex", "", [($sliceType($Int))], [Value], false, -1], ["FieldByName", "FieldByName", "", [$String], [Value], false, -1], ["FieldByNameFunc", "FieldByNameFunc", "", [($funcType([$String], [$Bool], false))], [Value], false, -1], ["Float", "Float", "", [], [$Float64], false, -1], ["Index", "Index", "", [$Int], [Value], false, -1], ["Int", "Int", "", [], [$Int64], false, -1], ["Interface", "Interface", "", [], [$emptyInterface], false, -1], ["InterfaceData", "InterfaceData", "", [], [($arrayType($Uintptr, 2))], false, -1], ["IsNil", "IsNil", "", [], [$Bool], false, -1], ["IsValid", "IsValid", "", [], [$Bool], false, -1], ["Kind", "Kind", "", [], [Kind], false, -1], ["Len", "Len", "", [], [$Int], false, -1], ["MapIndex", "MapIndex", "", [Value], [Value], false, -1], ["MapKeys", "MapKeys", "", [], [($sliceType(Value))], false, -1], ["Method", "Method", "", [$Int], [Value], false, -1], ["MethodByName", "MethodByName", "", [$String], [Value], false, -1], ["NumField", "NumField", "", [], [$Int], false, -1], ["NumMethod", "NumMethod", "", [], [$Int], false, -1], ["OverflowComplex", "OverflowComplex", "", [$Complex128], [$Bool], false, -1], ["OverflowFloat", "OverflowFloat", "", [$Float64], [$Bool], false, -1], ["OverflowInt", "OverflowInt", "", [$Int64], [$Bool], false, -1], ["OverflowUint", "OverflowUint", "", [$Uint64], [$Bool], false, -1], ["Pointer", "Pointer", "", [], [$Uintptr], false, -1], ["Recv", "Recv", "", [], [Value, $Bool], false, -1], ["Send", "Send", "", [Value], [], false, -1], ["Set", "Set", "", [Value], [], false, -1], ["SetBool", "SetBool", "", [$Bool], [], false, -1], ["SetBytes", "SetBytes", "", [($sliceType($Uint8))], [], false, -1], ["SetCap", "SetCap", "", [$Int], [], false, -1], ["SetComplex", "SetComplex", "", [$Complex128], [], false, -1], ["SetFloat", "SetFloat", "", [$Float64], [], false, -1], ["SetInt", "SetInt", "", [$Int64], [], false, -1], ["SetLen", "SetLen", "", [$Int], [], false, -1], ["SetMapIndex", "SetMapIndex", "", [Value, Value], [], false, -1], ["SetPointer", "SetPointer", "", [$UnsafePointer], [], false, -1], ["SetString", "SetString", "", [$String], [], false, -1], ["SetUint", "SetUint", "", [$Uint64], [], false, -1], ["Slice", "Slice", "", [$Int, $Int], [Value], false, -1], ["Slice3", "Slice3", "", [$Int, $Int, $Int], [Value], false, -1], ["String", "String", "", [], [$String], false, -1], ["TryRecv", "TryRecv", "", [], [Value, $Bool], false, -1], ["TrySend", "TrySend", "", [Value], [$Bool], false, -1], ["Type", "Type", "", [], [Type], false, -1], ["Uint", "Uint", "", [], [$Uint64], false, -1], ["UnsafeAddr", "UnsafeAddr", "", [], [$Uintptr], false, -1], ["assignTo", "assignTo", "reflect", [$String, ($ptrType(rtype)), ($ptrType($emptyInterface))], [Value], false, -1], ["call", "call", "reflect", [$String, ($sliceType(Value))], [($sliceType(Value))], false, -1], ["iword", "iword", "reflect", [], [iword], false, -1], ["kind", "kind", "reflect", [], [Kind], false, 2], ["mustBe", "mustBe", "reflect", [Kind], [], false, 2], ["mustBeAssignable", "mustBeAssignable", "reflect", [], [], false, 2], ["mustBeExported", "mustBeExported", "reflect", [], [], false, 2], ["recv", "recv", "reflect", [$Bool], [Value, $Bool], false, -1], ["runes", "runes", "reflect", [], [($sliceType($Int32))], false, -1], ["send", "send", "reflect", [Value, $Bool], [$Bool], false, -1], ["setRunes", "setRunes", "reflect", [($sliceType($Int32))], [], false, -1]];
		Value.init([["typ", "typ", "reflect", ($ptrType(rtype)), ""], ["val", "val", "reflect", $UnsafePointer, ""], ["flag", "", "reflect", flag, ""]]);
		flag.methods = [["kind", "kind", "reflect", [], [Kind], false, -1], ["mustBe", "mustBe", "reflect", [Kind], [], false, -1], ["mustBeAssignable", "mustBeAssignable", "reflect", [], [], false, -1], ["mustBeExported", "mustBeExported", "reflect", [], [], false, -1]];
		($ptrType(flag)).methods = [["kind", "kind", "reflect", [], [Kind], false, -1], ["mustBe", "mustBe", "reflect", [Kind], [], false, -1], ["mustBeAssignable", "mustBeAssignable", "reflect", [], [], false, -1], ["mustBeExported", "mustBeExported", "reflect", [], [], false, -1]];
		($ptrType(ValueError)).methods = [["Error", "Error", "", [], [$String], false, -1]];
		ValueError.init([["Method", "Method", "", $String, ""], ["Kind", "Kind", "", Kind, ""]]);
		initialized = false;
		kindNames = new ($sliceType($String))(["invalid", "bool", "int", "int8", "int16", "int32", "int64", "uint", "uint8", "uint16", "uint32", "uint64", "uintptr", "float32", "float64", "complex64", "complex128", "array", "chan", "func", "interface", "map", "ptr", "slice", "string", "struct", "unsafe.Pointer"]);
		var x;
		uint8Type = (x = TypeOf(new $Uint8(0)), (x !== null && x.constructor === ($ptrType(rtype)) ? x.$val : $typeAssertionFailed(x, ($ptrType(rtype)))));
		var used, x$1, x$2, x$3, x$4, x$5, x$6, x$7, x$8, x$9, x$10, x$11, x$12, x$13, pkg, _map, _key, x$14;
		used = (function(i) {
		});
		used((x$1 = new rtype.Ptr(0, 0, 0, 0, 0, 0, ($ptrType($Uintptr)).nil, 0, ($ptrType($String)).nil, ($ptrType(uncommonType)).nil, ($ptrType(rtype)).nil), new x$1.constructor.Struct(x$1)));
		used((x$2 = new uncommonType.Ptr(($ptrType($String)).nil, ($ptrType($String)).nil, ($sliceType(method)).nil), new x$2.constructor.Struct(x$2)));
		used((x$3 = new method.Ptr(($ptrType($String)).nil, ($ptrType($String)).nil, ($ptrType(rtype)).nil, ($ptrType(rtype)).nil, 0, 0), new x$3.constructor.Struct(x$3)));
		used((x$4 = new arrayType.Ptr(new rtype.Ptr(), ($ptrType(rtype)).nil, ($ptrType(rtype)).nil, 0), new x$4.constructor.Struct(x$4)));
		used((x$5 = new chanType.Ptr(new rtype.Ptr(), ($ptrType(rtype)).nil, 0), new x$5.constructor.Struct(x$5)));
		used((x$6 = new funcType.Ptr(new rtype.Ptr(), false, ($sliceType(($ptrType(rtype)))).nil, ($sliceType(($ptrType(rtype)))).nil), new x$6.constructor.Struct(x$6)));
		used((x$7 = new interfaceType.Ptr(new rtype.Ptr(), ($sliceType(imethod)).nil), new x$7.constructor.Struct(x$7)));
		used((x$8 = new mapType.Ptr(new rtype.Ptr(), ($ptrType(rtype)).nil, ($ptrType(rtype)).nil, ($ptrType(rtype)).nil, ($ptrType(rtype)).nil), new x$8.constructor.Struct(x$8)));
		used((x$9 = new ptrType.Ptr(new rtype.Ptr(), ($ptrType(rtype)).nil), new x$9.constructor.Struct(x$9)));
		used((x$10 = new sliceType.Ptr(new rtype.Ptr(), ($ptrType(rtype)).nil), new x$10.constructor.Struct(x$10)));
		used((x$11 = new structType.Ptr(new rtype.Ptr(), ($sliceType(structField)).nil), new x$11.constructor.Struct(x$11)));
		used((x$12 = new imethod.Ptr(($ptrType($String)).nil, ($ptrType($String)).nil, ($ptrType(rtype)).nil), new x$12.constructor.Struct(x$12)));
		used((x$13 = new structField.Ptr(($ptrType($String)).nil, ($ptrType($String)).nil, ($ptrType(rtype)).nil, ($ptrType($String)).nil, 0), new x$13.constructor.Struct(x$13)));
		pkg = $pkg;
		pkg.kinds = $externalize((_map = new $Map(), _key = "Bool", _map[_key] = { k: _key, v: 1 }, _key = "Int", _map[_key] = { k: _key, v: 2 }, _key = "Int8", _map[_key] = { k: _key, v: 3 }, _key = "Int16", _map[_key] = { k: _key, v: 4 }, _key = "Int32", _map[_key] = { k: _key, v: 5 }, _key = "Int64", _map[_key] = { k: _key, v: 6 }, _key = "Uint", _map[_key] = { k: _key, v: 7 }, _key = "Uint8", _map[_key] = { k: _key, v: 8 }, _key = "Uint16", _map[_key] = { k: _key, v: 9 }, _key = "Uint32", _map[_key] = { k: _key, v: 10 }, _key = "Uint64", _map[_key] = { k: _key, v: 11 }, _key = "Uintptr", _map[_key] = { k: _key, v: 12 }, _key = "Float32", _map[_key] = { k: _key, v: 13 }, _key = "Float64", _map[_key] = { k: _key, v: 14 }, _key = "Complex64", _map[_key] = { k: _key, v: 15 }, _key = "Complex128", _map[_key] = { k: _key, v: 16 }, _key = "Array", _map[_key] = { k: _key, v: 17 }, _key = "Chan", _map[_key] = { k: _key, v: 18 }, _key = "Func", _map[_key] = { k: _key, v: 19 }, _key = "Interface", _map[_key] = { k: _key, v: 20 }, _key = "Map", _map[_key] = { k: _key, v: 21 }, _key = "Ptr", _map[_key] = { k: _key, v: 22 }, _key = "Slice", _map[_key] = { k: _key, v: 23 }, _key = "String", _map[_key] = { k: _key, v: 24 }, _key = "Struct", _map[_key] = { k: _key, v: 25 }, _key = "UnsafePointer", _map[_key] = { k: _key, v: 26 }, _map), ($mapType($String, Kind)));
		pkg.RecvDir = 1;
		pkg.SendDir = 2;
		pkg.BothDir = 3;
		$reflect = pkg;
		initialized = true;
		uint8Type = (x$14 = TypeOf(new $Uint8(0)), (x$14 !== null && x$14.constructor === ($ptrType(rtype)) ? x$14.$val : $typeAssertionFailed(x$14, ($ptrType(rtype)))));
	};
	return $pkg;
})();
$packages["fmt"] = (function() {
	var $pkg = {}, strconv = $packages["strconv"], utf8 = $packages["unicode/utf8"], errors = $packages["errors"], io = $packages["io"], os = $packages["os"], reflect = $packages["reflect"], sync = $packages["sync"], math = $packages["math"], fmt, State, Formatter, Stringer, GoStringer, buffer, pp, cache, runeUnreader, scanError, ss, ssave, doPrec, newCache, newPrinter, Sprintf, Errorf, getField, parsenum, intFromArg, parseArgNumber, isSpace, notSpace, indexRune, padZeroBytes, padSpaceBytes, trueBytes, falseBytes, commaSpaceBytes, nilAngleBytes, nilParenBytes, nilBytes, mapBytes, percentBangBytes, missingBytes, badIndexBytes, panicBytes, extraBytes, irparenBytes, bytesBytes, badWidthBytes, badPrecBytes, noVerbBytes, ppFree, intBits, uintptrBits, space, ssFree, complexError, boolError;
	fmt = $pkg.fmt = $newType(0, "Struct", "fmt.fmt", "fmt", "fmt", function(intbuf_, buf_, wid_, prec_, widPresent_, precPresent_, minus_, plus_, sharp_, space_, unicode_, uniQuote_, zero_) {
		this.$val = this;
		this.intbuf = intbuf_ !== undefined ? intbuf_ : $makeNativeArray("Uint8", 65, function() { return 0; });
		this.buf = buf_ !== undefined ? buf_ : ($ptrType(buffer)).nil;
		this.wid = wid_ !== undefined ? wid_ : 0;
		this.prec = prec_ !== undefined ? prec_ : 0;
		this.widPresent = widPresent_ !== undefined ? widPresent_ : false;
		this.precPresent = precPresent_ !== undefined ? precPresent_ : false;
		this.minus = minus_ !== undefined ? minus_ : false;
		this.plus = plus_ !== undefined ? plus_ : false;
		this.sharp = sharp_ !== undefined ? sharp_ : false;
		this.space = space_ !== undefined ? space_ : false;
		this.unicode = unicode_ !== undefined ? unicode_ : false;
		this.uniQuote = uniQuote_ !== undefined ? uniQuote_ : false;
		this.zero = zero_ !== undefined ? zero_ : false;
	});
	State = $pkg.State = $newType(8, "Interface", "fmt.State", "State", "fmt", null);
	Formatter = $pkg.Formatter = $newType(8, "Interface", "fmt.Formatter", "Formatter", "fmt", null);
	Stringer = $pkg.Stringer = $newType(8, "Interface", "fmt.Stringer", "Stringer", "fmt", null);
	GoStringer = $pkg.GoStringer = $newType(8, "Interface", "fmt.GoStringer", "GoStringer", "fmt", null);
	buffer = $pkg.buffer = $newType(12, "Slice", "fmt.buffer", "buffer", "fmt", null);
	pp = $pkg.pp = $newType(0, "Struct", "fmt.pp", "pp", "fmt", function(n_, panicking_, erroring_, buf_, arg_, value_, reordered_, goodArgNum_, runeBuf_, fmt_) {
		this.$val = this;
		this.n = n_ !== undefined ? n_ : 0;
		this.panicking = panicking_ !== undefined ? panicking_ : false;
		this.erroring = erroring_ !== undefined ? erroring_ : false;
		this.buf = buf_ !== undefined ? buf_ : buffer.nil;
		this.arg = arg_ !== undefined ? arg_ : null;
		this.value = value_ !== undefined ? value_ : new reflect.Value.Ptr();
		this.reordered = reordered_ !== undefined ? reordered_ : false;
		this.goodArgNum = goodArgNum_ !== undefined ? goodArgNum_ : false;
		this.runeBuf = runeBuf_ !== undefined ? runeBuf_ : $makeNativeArray("Uint8", 4, function() { return 0; });
		this.fmt = fmt_ !== undefined ? fmt_ : new fmt.Ptr();
	});
	cache = $pkg.cache = $newType(0, "Struct", "fmt.cache", "cache", "fmt", function(mu_, saved_, new$2_) {
		this.$val = this;
		this.mu = mu_ !== undefined ? mu_ : new sync.Mutex.Ptr();
		this.saved = saved_ !== undefined ? saved_ : ($sliceType($emptyInterface)).nil;
		this.new$2 = new$2_ !== undefined ? new$2_ : $throwNilPointerError;
	});
	runeUnreader = $pkg.runeUnreader = $newType(8, "Interface", "fmt.runeUnreader", "runeUnreader", "fmt", null);
	scanError = $pkg.scanError = $newType(0, "Struct", "fmt.scanError", "scanError", "fmt", function(err_) {
		this.$val = this;
		this.err = err_ !== undefined ? err_ : null;
	});
	ss = $pkg.ss = $newType(0, "Struct", "fmt.ss", "ss", "fmt", function(rr_, buf_, peekRune_, prevRune_, count_, atEOF_, ssave_) {
		this.$val = this;
		this.rr = rr_ !== undefined ? rr_ : null;
		this.buf = buf_ !== undefined ? buf_ : buffer.nil;
		this.peekRune = peekRune_ !== undefined ? peekRune_ : 0;
		this.prevRune = prevRune_ !== undefined ? prevRune_ : 0;
		this.count = count_ !== undefined ? count_ : 0;
		this.atEOF = atEOF_ !== undefined ? atEOF_ : false;
		this.ssave = ssave_ !== undefined ? ssave_ : new ssave.Ptr();
	});
	ssave = $pkg.ssave = $newType(0, "Struct", "fmt.ssave", "ssave", "fmt", function(validSave_, nlIsEnd_, nlIsSpace_, argLimit_, limit_, maxWid_) {
		this.$val = this;
		this.validSave = validSave_ !== undefined ? validSave_ : false;
		this.nlIsEnd = nlIsEnd_ !== undefined ? nlIsEnd_ : false;
		this.nlIsSpace = nlIsSpace_ !== undefined ? nlIsSpace_ : false;
		this.argLimit = argLimit_ !== undefined ? argLimit_ : 0;
		this.limit = limit_ !== undefined ? limit_ : 0;
		this.maxWid = maxWid_ !== undefined ? maxWid_ : 0;
	});
	fmt.Ptr.prototype.clearflags = function() {
		var f;
		f = this;
		f.wid = 0;
		f.widPresent = false;
		f.prec = 0;
		f.precPresent = false;
		f.minus = false;
		f.plus = false;
		f.sharp = false;
		f.space = false;
		f.unicode = false;
		f.uniQuote = false;
		f.zero = false;
	};
	fmt.prototype.clearflags = function() { return this.$val.clearflags(); };
	fmt.Ptr.prototype.init = function(buf) {
		var f;
		f = this;
		f.buf = buf;
		f.clearflags();
	};
	fmt.prototype.init = function(buf) { return this.$val.init(buf); };
	fmt.Ptr.prototype.computePadding = function(width) {
		var padding, leftWidth, rightWidth, f, left, w, _tmp, _tmp$1, _tmp$2, _tmp$3, _tmp$4, _tmp$5, _tmp$6, _tmp$7, _tmp$8;
		padding = ($sliceType($Uint8)).nil;
		leftWidth = 0;
		rightWidth = 0;
		f = this;
		left = !f.minus;
		w = f.wid;
		if (w < 0) {
			left = false;
			w = -w;
		}
		w = w - (width) >> 0;
		if (w > 0) {
			if (left && f.zero) {
				_tmp = padZeroBytes; _tmp$1 = w; _tmp$2 = 0; padding = _tmp; leftWidth = _tmp$1; rightWidth = _tmp$2;
				return [padding, leftWidth, rightWidth];
			}
			if (left) {
				_tmp$3 = padSpaceBytes; _tmp$4 = w; _tmp$5 = 0; padding = _tmp$3; leftWidth = _tmp$4; rightWidth = _tmp$5;
				return [padding, leftWidth, rightWidth];
			} else {
				_tmp$6 = padSpaceBytes; _tmp$7 = 0; _tmp$8 = w; padding = _tmp$6; leftWidth = _tmp$7; rightWidth = _tmp$8;
				return [padding, leftWidth, rightWidth];
			}
		}
		return [padding, leftWidth, rightWidth];
	};
	fmt.prototype.computePadding = function(width) { return this.$val.computePadding(width); };
	fmt.Ptr.prototype.writePadding = function(n, padding) {
		var f, m;
		f = this;
		while (n > 0) {
			m = n;
			if (m > 65) {
				m = 65;
			}
			f.buf.Write($subslice(padding, 0, m));
			n = n - (m) >> 0;
		}
	};
	fmt.prototype.writePadding = function(n, padding) { return this.$val.writePadding(n, padding); };
	fmt.Ptr.prototype.pad = function(b) {
		var f, _tuple, padding, left, right;
		f = this;
		if (!f.widPresent || (f.wid === 0)) {
			f.buf.Write(b);
			return;
		}
		_tuple = f.computePadding(b.length); padding = _tuple[0]; left = _tuple[1]; right = _tuple[2];
		if (left > 0) {
			f.writePadding(left, padding);
		}
		f.buf.Write(b);
		if (right > 0) {
			f.writePadding(right, padding);
		}
	};
	fmt.prototype.pad = function(b) { return this.$val.pad(b); };
	fmt.Ptr.prototype.padString = function(s) {
		var f, _tuple, padding, left, right;
		f = this;
		if (!f.widPresent || (f.wid === 0)) {
			f.buf.WriteString(s);
			return;
		}
		_tuple = f.computePadding(utf8.RuneCountInString(s)); padding = _tuple[0]; left = _tuple[1]; right = _tuple[2];
		if (left > 0) {
			f.writePadding(left, padding);
		}
		f.buf.WriteString(s);
		if (right > 0) {
			f.writePadding(right, padding);
		}
	};
	fmt.prototype.padString = function(s) { return this.$val.padString(s); };
	fmt.Ptr.prototype.fmt_boolean = function(v) {
		var f;
		f = this;
		if (v) {
			f.pad(trueBytes);
		} else {
			f.pad(falseBytes);
		}
	};
	fmt.prototype.fmt_boolean = function(v) { return this.$val.fmt_boolean(v); };
	fmt.Ptr.prototype.integer = function(a, base, signedness, digits) {
		var f, buf, negative, prec, i, ua, _ref, runeWidth, width, j;
		f = this;
		if (f.precPresent && (f.prec === 0) && (a.high === 0 && a.low === 0)) {
			return;
		}
		buf = $subslice(new ($sliceType($Uint8))(f.intbuf), 0);
		if (f.widPresent && f.wid > 65) {
			buf = ($sliceType($Uint8)).make(f.wid, 0, function() { return 0; });
		}
		negative = signedness === true && (a.high < 0 || (a.high === 0 && a.low < 0));
		if (negative) {
			a = new $Int64(-a.high, -a.low);
		}
		prec = 0;
		if (f.precPresent) {
			prec = f.prec;
			f.zero = false;
		} else if (f.zero && f.widPresent && !f.minus && f.wid > 0) {
			prec = f.wid;
			if (negative || f.plus || f.space) {
				prec = prec - 1 >> 0;
			}
		}
		i = buf.length;
		ua = new $Uint64(a.high, a.low);
		while ((ua.high > base.high || (ua.high === base.high && ua.low >= base.low))) {
			i = i - 1 >> 0;
			(i < 0 || i >= buf.length) ? $throwRuntimeError("index out of range") : buf.array[buf.offset + i] = digits.charCodeAt($flatten64($div64(ua, base, true)));
			ua = $div64(ua, (base), false);
		}
		i = i - 1 >> 0;
		(i < 0 || i >= buf.length) ? $throwRuntimeError("index out of range") : buf.array[buf.offset + i] = digits.charCodeAt($flatten64(ua));
		while (i > 0 && prec > (buf.length - i >> 0)) {
			i = i - 1 >> 0;
			(i < 0 || i >= buf.length) ? $throwRuntimeError("index out of range") : buf.array[buf.offset + i] = 48;
		}
		if (f.sharp) {
			_ref = base;
			if ((_ref.high === 0 && _ref.low === 8)) {
				if (!((((i < 0 || i >= buf.length) ? $throwRuntimeError("index out of range") : buf.array[buf.offset + i]) === 48))) {
					i = i - 1 >> 0;
					(i < 0 || i >= buf.length) ? $throwRuntimeError("index out of range") : buf.array[buf.offset + i] = 48;
				}
			} else if ((_ref.high === 0 && _ref.low === 16)) {
				i = i - 1 >> 0;
				(i < 0 || i >= buf.length) ? $throwRuntimeError("index out of range") : buf.array[buf.offset + i] = (120 + digits.charCodeAt(10) << 24 >>> 24) - 97 << 24 >>> 24;
				i = i - 1 >> 0;
				(i < 0 || i >= buf.length) ? $throwRuntimeError("index out of range") : buf.array[buf.offset + i] = 48;
			}
		}
		if (f.unicode) {
			i = i - 1 >> 0;
			(i < 0 || i >= buf.length) ? $throwRuntimeError("index out of range") : buf.array[buf.offset + i] = 43;
			i = i - 1 >> 0;
			(i < 0 || i >= buf.length) ? $throwRuntimeError("index out of range") : buf.array[buf.offset + i] = 85;
		}
		if (negative) {
			i = i - 1 >> 0;
			(i < 0 || i >= buf.length) ? $throwRuntimeError("index out of range") : buf.array[buf.offset + i] = 45;
		} else if (f.plus) {
			i = i - 1 >> 0;
			(i < 0 || i >= buf.length) ? $throwRuntimeError("index out of range") : buf.array[buf.offset + i] = 43;
		} else if (f.space) {
			i = i - 1 >> 0;
			(i < 0 || i >= buf.length) ? $throwRuntimeError("index out of range") : buf.array[buf.offset + i] = 32;
		}
		if (f.unicode && f.uniQuote && (a.high > 0 || (a.high === 0 && a.low >= 0)) && (a.high < 0 || (a.high === 0 && a.low <= 1114111)) && strconv.IsPrint(((a.low + ((a.high >> 31) * 4294967296)) >> 0))) {
			runeWidth = utf8.RuneLen(((a.low + ((a.high >> 31) * 4294967296)) >> 0));
			width = (2 + runeWidth >> 0) + 1 >> 0;
			$copySlice($subslice(buf, (i - width >> 0)), $subslice(buf, i));
			i = i - (width) >> 0;
			j = buf.length - width >> 0;
			(j < 0 || j >= buf.length) ? $throwRuntimeError("index out of range") : buf.array[buf.offset + j] = 32;
			j = j + 1 >> 0;
			(j < 0 || j >= buf.length) ? $throwRuntimeError("index out of range") : buf.array[buf.offset + j] = 39;
			j = j + 1 >> 0;
			utf8.EncodeRune($subslice(buf, j), ((a.low + ((a.high >> 31) * 4294967296)) >> 0));
			j = j + (runeWidth) >> 0;
			(j < 0 || j >= buf.length) ? $throwRuntimeError("index out of range") : buf.array[buf.offset + j] = 39;
		}
		f.pad($subslice(buf, i));
	};
	fmt.prototype.integer = function(a, base, signedness, digits) { return this.$val.integer(a, base, signedness, digits); };
	fmt.Ptr.prototype.truncate = function(s) {
		var f, n, _ref, _i, _rune, i;
		f = this;
		if (f.precPresent && f.prec < utf8.RuneCountInString(s)) {
			n = f.prec;
			_ref = s;
			_i = 0;
			while (_i < _ref.length) {
				_rune = $decodeRune(_ref, _i);
				i = _i;
				if (n === 0) {
					s = s.substring(0, i);
					break;
				}
				n = n - 1 >> 0;
				_i += _rune[1];
			}
		}
		return s;
	};
	fmt.prototype.truncate = function(s) { return this.$val.truncate(s); };
	fmt.Ptr.prototype.fmt_s = function(s) {
		var f;
		f = this;
		s = f.truncate(s);
		f.padString(s);
	};
	fmt.prototype.fmt_s = function(s) { return this.$val.fmt_s(s); };
	fmt.Ptr.prototype.fmt_sbx = function(s, b, digits) {
		var f, n, x, buf, i, c;
		f = this;
		n = b.length;
		if (b === ($sliceType($Uint8)).nil) {
			n = s.length;
		}
		x = (digits.charCodeAt(10) - 97 << 24 >>> 24) + 120 << 24 >>> 24;
		buf = ($sliceType($Uint8)).nil;
		i = 0;
		while (i < n) {
			if (i > 0 && f.space) {
				buf = $append(buf, 32);
			}
			if (f.sharp) {
				buf = $append(buf, 48, x);
			}
			c = 0;
			if (b === ($sliceType($Uint8)).nil) {
				c = s.charCodeAt(i);
			} else {
				c = ((i < 0 || i >= b.length) ? $throwRuntimeError("index out of range") : b.array[b.offset + i]);
			}
			buf = $append(buf, digits.charCodeAt((c >>> 4 << 24 >>> 24)), digits.charCodeAt(((c & 15) >>> 0)));
			i = i + 1 >> 0;
		}
		f.pad(buf);
	};
	fmt.prototype.fmt_sbx = function(s, b, digits) { return this.$val.fmt_sbx(s, b, digits); };
	fmt.Ptr.prototype.fmt_sx = function(s, digits) {
		var f;
		f = this;
		f.fmt_sbx(s, ($sliceType($Uint8)).nil, digits);
	};
	fmt.prototype.fmt_sx = function(s, digits) { return this.$val.fmt_sx(s, digits); };
	fmt.Ptr.prototype.fmt_bx = function(b, digits) {
		var f;
		f = this;
		f.fmt_sbx("", b, digits);
	};
	fmt.prototype.fmt_bx = function(b, digits) { return this.$val.fmt_bx(b, digits); };
	fmt.Ptr.prototype.fmt_q = function(s) {
		var f, quoted;
		f = this;
		s = f.truncate(s);
		quoted = "";
		if (f.sharp && strconv.CanBackquote(s)) {
			quoted = "`" + s + "`";
		} else {
			if (f.plus) {
				quoted = strconv.QuoteToASCII(s);
			} else {
				quoted = strconv.Quote(s);
			}
		}
		f.padString(quoted);
	};
	fmt.prototype.fmt_q = function(s) { return this.$val.fmt_q(s); };
	fmt.Ptr.prototype.fmt_qc = function(c) {
		var f, quoted;
		f = this;
		quoted = ($sliceType($Uint8)).nil;
		if (f.plus) {
			quoted = strconv.AppendQuoteRuneToASCII($subslice(new ($sliceType($Uint8))(f.intbuf), 0, 0), ((c.low + ((c.high >> 31) * 4294967296)) >> 0));
		} else {
			quoted = strconv.AppendQuoteRune($subslice(new ($sliceType($Uint8))(f.intbuf), 0, 0), ((c.low + ((c.high >> 31) * 4294967296)) >> 0));
		}
		f.pad(quoted);
	};
	fmt.prototype.fmt_qc = function(c) { return this.$val.fmt_qc(c); };
	doPrec = function(f, def) {
		if (f.precPresent) {
			return f.prec;
		}
		return def;
	};
	fmt.Ptr.prototype.formatFloat = function(v, verb, prec, n) {
		var f, slice, _ref;
		f = this;
		f.intbuf[0] = 32;
		slice = strconv.AppendFloat($subslice(new ($sliceType($Uint8))(f.intbuf), 0, 1), v, verb, prec, n);
		_ref = ((1 < 0 || 1 >= slice.length) ? $throwRuntimeError("index out of range") : slice.array[slice.offset + 1]);
		if (_ref === 45 || _ref === 43) {
			if (f.zero && f.widPresent && f.wid > slice.length) {
				f.buf.WriteByte(((1 < 0 || 1 >= slice.length) ? $throwRuntimeError("index out of range") : slice.array[slice.offset + 1]));
				f.wid = f.wid - 1 >> 0;
				f.pad($subslice(slice, 2));
				return;
			}
			slice = $subslice(slice, 1);
		} else {
			if (f.plus) {
				(0 < 0 || 0 >= slice.length) ? $throwRuntimeError("index out of range") : slice.array[slice.offset + 0] = 43;
			} else if (f.space) {
			} else {
				slice = $subslice(slice, 1);
			}
		}
		f.pad(slice);
	};
	fmt.prototype.formatFloat = function(v, verb, prec, n) { return this.$val.formatFloat(v, verb, prec, n); };
	fmt.Ptr.prototype.fmt_e64 = function(v) {
		var f;
		f = this;
		f.formatFloat(v, 101, doPrec(f, 6), 64);
	};
	fmt.prototype.fmt_e64 = function(v) { return this.$val.fmt_e64(v); };
	fmt.Ptr.prototype.fmt_E64 = function(v) {
		var f;
		f = this;
		f.formatFloat(v, 69, doPrec(f, 6), 64);
	};
	fmt.prototype.fmt_E64 = function(v) { return this.$val.fmt_E64(v); };
	fmt.Ptr.prototype.fmt_f64 = function(v) {
		var f;
		f = this;
		f.formatFloat(v, 102, doPrec(f, 6), 64);
	};
	fmt.prototype.fmt_f64 = function(v) { return this.$val.fmt_f64(v); };
	fmt.Ptr.prototype.fmt_g64 = function(v) {
		var f;
		f = this;
		f.formatFloat(v, 103, doPrec(f, -1), 64);
	};
	fmt.prototype.fmt_g64 = function(v) { return this.$val.fmt_g64(v); };
	fmt.Ptr.prototype.fmt_G64 = function(v) {
		var f;
		f = this;
		f.formatFloat(v, 71, doPrec(f, -1), 64);
	};
	fmt.prototype.fmt_G64 = function(v) { return this.$val.fmt_G64(v); };
	fmt.Ptr.prototype.fmt_fb64 = function(v) {
		var f;
		f = this;
		f.formatFloat(v, 98, 0, 64);
	};
	fmt.prototype.fmt_fb64 = function(v) { return this.$val.fmt_fb64(v); };
	fmt.Ptr.prototype.fmt_e32 = function(v) {
		var f;
		f = this;
		f.formatFloat($coerceFloat32(v), 101, doPrec(f, 6), 32);
	};
	fmt.prototype.fmt_e32 = function(v) { return this.$val.fmt_e32(v); };
	fmt.Ptr.prototype.fmt_E32 = function(v) {
		var f;
		f = this;
		f.formatFloat($coerceFloat32(v), 69, doPrec(f, 6), 32);
	};
	fmt.prototype.fmt_E32 = function(v) { return this.$val.fmt_E32(v); };
	fmt.Ptr.prototype.fmt_f32 = function(v) {
		var f;
		f = this;
		f.formatFloat($coerceFloat32(v), 102, doPrec(f, 6), 32);
	};
	fmt.prototype.fmt_f32 = function(v) { return this.$val.fmt_f32(v); };
	fmt.Ptr.prototype.fmt_g32 = function(v) {
		var f;
		f = this;
		f.formatFloat($coerceFloat32(v), 103, doPrec(f, -1), 32);
	};
	fmt.prototype.fmt_g32 = function(v) { return this.$val.fmt_g32(v); };
	fmt.Ptr.prototype.fmt_G32 = function(v) {
		var f;
		f = this;
		f.formatFloat($coerceFloat32(v), 71, doPrec(f, -1), 32);
	};
	fmt.prototype.fmt_G32 = function(v) { return this.$val.fmt_G32(v); };
	fmt.Ptr.prototype.fmt_fb32 = function(v) {
		var f;
		f = this;
		f.formatFloat($coerceFloat32(v), 98, 0, 32);
	};
	fmt.prototype.fmt_fb32 = function(v) { return this.$val.fmt_fb32(v); };
	fmt.Ptr.prototype.fmt_c64 = function(v, verb) {
		var f, r, oldPlus, i, _ref;
		f = this;
		f.buf.WriteByte(40);
		r = v.real;
		oldPlus = f.plus;
		i = 0;
		while (true) {
			_ref = verb;
			if (_ref === 98) {
				f.fmt_fb32(r);
			} else if (_ref === 101) {
				f.fmt_e32(r);
			} else if (_ref === 69) {
				f.fmt_E32(r);
			} else if (_ref === 102) {
				f.fmt_f32(r);
			} else if (_ref === 103) {
				f.fmt_g32(r);
			} else if (_ref === 71) {
				f.fmt_G32(r);
			}
			if (!((i === 0))) {
				break;
			}
			f.plus = true;
			r = v.imag;
			i = i + 1 >> 0;
		}
		f.plus = oldPlus;
		f.buf.Write(irparenBytes);
	};
	fmt.prototype.fmt_c64 = function(v, verb) { return this.$val.fmt_c64(v, verb); };
	fmt.Ptr.prototype.fmt_c128 = function(v, verb) {
		var f, r, oldPlus, i, _ref;
		f = this;
		f.buf.WriteByte(40);
		r = v.real;
		oldPlus = f.plus;
		i = 0;
		while (true) {
			_ref = verb;
			if (_ref === 98) {
				f.fmt_fb64(r);
			} else if (_ref === 101) {
				f.fmt_e64(r);
			} else if (_ref === 69) {
				f.fmt_E64(r);
			} else if (_ref === 102) {
				f.fmt_f64(r);
			} else if (_ref === 103) {
				f.fmt_g64(r);
			} else if (_ref === 71) {
				f.fmt_G64(r);
			}
			if (!((i === 0))) {
				break;
			}
			f.plus = true;
			r = v.imag;
			i = i + 1 >> 0;
		}
		f.plus = oldPlus;
		f.buf.Write(irparenBytes);
	};
	fmt.prototype.fmt_c128 = function(v, verb) { return this.$val.fmt_c128(v, verb); };
	$ptrType(buffer).prototype.Write = function(p) {
		var n, err, b, _tmp, _tmp$1;
		n = 0;
		err = null;
		b = this;
		b.$set($appendSlice(b.$get(), p));
		_tmp = p.length; _tmp$1 = null; n = _tmp; err = _tmp$1;
		return [n, err];
	};
	buffer.prototype.Write = function(p) { var obj = this; return (new ($ptrType(buffer))(function() { return obj; }, null)).Write(p); };
	$ptrType(buffer).prototype.WriteString = function(s) {
		var n, err, b, _tmp, _tmp$1;
		n = 0;
		err = null;
		b = this;
		b.$set($appendSlice(b.$get(), new buffer($stringToBytes(s))));
		_tmp = s.length; _tmp$1 = null; n = _tmp; err = _tmp$1;
		return [n, err];
	};
	buffer.prototype.WriteString = function(s) { var obj = this; return (new ($ptrType(buffer))(function() { return obj; }, null)).WriteString(s); };
	$ptrType(buffer).prototype.WriteByte = function(c) {
		var b;
		b = this;
		b.$set($append(b.$get(), c));
		return null;
	};
	buffer.prototype.WriteByte = function(c) { var obj = this; return (new ($ptrType(buffer))(function() { return obj; }, null)).WriteByte(c); };
	$ptrType(buffer).prototype.WriteRune = function(r) {
		var bp, b, n, x, w;
		bp = this;
		if (r < 128) {
			bp.$set($append(bp.$get(), (r << 24 >>> 24)));
			return null;
		}
		b = bp.$get();
		n = b.length;
		while ((n + 4 >> 0) > b.capacity) {
			b = $append(b, 0);
		}
		w = utf8.EncodeRune((x = $subslice(b, n, (n + 4 >> 0)), $subslice(new ($sliceType($Uint8))(x.array), x.offset, x.offset + x.length)), r);
		bp.$set($subslice(b, 0, (n + w >> 0)));
		return null;
	};
	buffer.prototype.WriteRune = function(r) { var obj = this; return (new ($ptrType(buffer))(function() { return obj; }, null)).WriteRune(r); };
	cache.Ptr.prototype.put = function(x) {
		var c;
		c = this;
		c.mu.Lock();
		if (c.saved.length < c.saved.capacity) {
			c.saved = $append(c.saved, x);
		}
		c.mu.Unlock();
	};
	cache.prototype.put = function(x) { return this.$val.put(x); };
	cache.Ptr.prototype.get = function() {
		var c, n, x, x$1, x$2;
		c = this;
		c.mu.Lock();
		n = c.saved.length;
		if (n === 0) {
			c.mu.Unlock();
			return c.new$2();
		}
		x$2 = (x = c.saved, x$1 = n - 1 >> 0, ((x$1 < 0 || x$1 >= x.length) ? $throwRuntimeError("index out of range") : x.array[x.offset + x$1]));
		c.saved = $subslice(c.saved, 0, (n - 1 >> 0));
		c.mu.Unlock();
		return x$2;
	};
	cache.prototype.get = function() { return this.$val.get(); };
	newCache = function(f) {
		return new cache.Ptr(new sync.Mutex.Ptr(), ($sliceType($emptyInterface)).make(0, 100, function() { return null; }), f);
	};
	newPrinter = function() {
		var x, p, v;
		p = (x = ppFree.get(), (x !== null && x.constructor === ($ptrType(pp)) ? x.$val : $typeAssertionFailed(x, ($ptrType(pp)))));
		p.panicking = false;
		p.erroring = false;
		p.fmt.init(new ($ptrType(buffer))(function() { return p.buf; }, function(v) { p.buf = v;; }));
		return p;
	};
	pp.Ptr.prototype.free = function() {
		var p;
		p = this;
		if (p.buf.capacity > 1024) {
			return;
		}
		p.buf = $subslice(p.buf, 0, 0);
		p.arg = null;
		p.value = new reflect.Value.Ptr(($ptrType(reflect.rtype)).nil, 0, 0);
		ppFree.put(p);
	};
	pp.prototype.free = function() { return this.$val.free(); };
	pp.Ptr.prototype.Width = function() {
		var wid, ok, p, _tmp, _tmp$1;
		wid = 0;
		ok = false;
		p = this;
		_tmp = p.fmt.wid; _tmp$1 = p.fmt.widPresent; wid = _tmp; ok = _tmp$1;
		return [wid, ok];
	};
	pp.prototype.Width = function() { return this.$val.Width(); };
	pp.Ptr.prototype.Precision = function() {
		var prec, ok, p, _tmp, _tmp$1;
		prec = 0;
		ok = false;
		p = this;
		_tmp = p.fmt.prec; _tmp$1 = p.fmt.precPresent; prec = _tmp; ok = _tmp$1;
		return [prec, ok];
	};
	pp.prototype.Precision = function() { return this.$val.Precision(); };
	pp.Ptr.prototype.Flag = function(b) {
		var p, _ref;
		p = this;
		_ref = b;
		if (_ref === 45) {
			return p.fmt.minus;
		} else if (_ref === 43) {
			return p.fmt.plus;
		} else if (_ref === 35) {
			return p.fmt.sharp;
		} else if (_ref === 32) {
			return p.fmt.space;
		} else if (_ref === 48) {
			return p.fmt.zero;
		}
		return false;
	};
	pp.prototype.Flag = function(b) { return this.$val.Flag(b); };
	pp.Ptr.prototype.add = function(c) {
		var p, v;
		p = this;
		(new ($ptrType(buffer))(function() { return p.buf; }, function(v) { p.buf = v; })).WriteRune(c);
	};
	pp.prototype.add = function(c) { return this.$val.add(c); };
	pp.Ptr.prototype.Write = function(b) {
		var ret, err, p, _tuple, v;
		ret = 0;
		err = null;
		p = this;
		_tuple = (new ($ptrType(buffer))(function() { return p.buf; }, function(v) { p.buf = v; })).Write(b); ret = _tuple[0]; err = _tuple[1];
		return [ret, err];
	};
	pp.prototype.Write = function(b) { return this.$val.Write(b); };
	Sprintf = $pkg.Sprintf = function(format, a) {
		var p, s;
		p = newPrinter();
		p.doPrintf(format, a);
		s = $bytesToString(p.buf);
		p.free();
		return s;
	};
	Errorf = $pkg.Errorf = function(format, a) {
		return errors.New(Sprintf(format, a));
	};
	getField = function(v, i) {
		var _struct, val, _struct$1, _struct$2;
		val = (_struct = v.Field(i), new reflect.Value.Ptr(_struct.typ, _struct.val, _struct.flag));
		if ((val.Kind() === 20) && !val.IsNil()) {
			val = (_struct$1 = val.Elem(), new reflect.Value.Ptr(_struct$1.typ, _struct$1.val, _struct$1.flag));
		}
		return (_struct$2 = val, new reflect.Value.Ptr(_struct$2.typ, _struct$2.val, _struct$2.flag));
	};
	parsenum = function(s, start, end) {
		var num, isnum, newi, _tmp, _tmp$1, _tmp$2;
		num = 0;
		isnum = false;
		newi = 0;
		if (start >= end) {
			_tmp = 0; _tmp$1 = false; _tmp$2 = end; num = _tmp; isnum = _tmp$1; newi = _tmp$2;
			return [num, isnum, newi];
		}
		newi = start;
		while (newi < end && 48 <= s.charCodeAt(newi) && s.charCodeAt(newi) <= 57) {
			num = ((((num >>> 16 << 16) * 10 >> 0) + (num << 16 >>> 16) * 10) >> 0) + ((s.charCodeAt(newi) - 48 << 24 >>> 24) >> 0) >> 0;
			isnum = true;
			newi = newi + 1 >> 0;
		}
		return [num, isnum, newi];
	};
	pp.Ptr.prototype.unknownType = function(v) {
		var p, v$1, v$2, v$3, v$4;
		p = this;
		if ($interfaceIsEqual(v, null)) {
			(new ($ptrType(buffer))(function() { return p.buf; }, function(v$1) { p.buf = v$1; })).Write(nilAngleBytes);
			return;
		}
		(new ($ptrType(buffer))(function() { return p.buf; }, function(v$2) { p.buf = v$2; })).WriteByte(63);
		(new ($ptrType(buffer))(function() { return p.buf; }, function(v$3) { p.buf = v$3; })).WriteString(reflect.TypeOf(v).String());
		(new ($ptrType(buffer))(function() { return p.buf; }, function(v$4) { p.buf = v$4; })).WriteByte(63);
	};
	pp.prototype.unknownType = function(v) { return this.$val.unknownType(v); };
	pp.Ptr.prototype.badVerb = function(verb) {
		var p, v, v$1, _struct, v$2;
		p = this;
		p.erroring = true;
		p.add(37);
		p.add(33);
		p.add(verb);
		p.add(40);
		if (!($interfaceIsEqual(p.arg, null))) {
			(new ($ptrType(buffer))(function() { return p.buf; }, function(v) { p.buf = v; })).WriteString(reflect.TypeOf(p.arg).String());
			p.add(61);
			p.printArg(p.arg, 118, false, false, 0);
		} else if (p.value.IsValid()) {
			(new ($ptrType(buffer))(function() { return p.buf; }, function(v$1) { p.buf = v$1; })).WriteString(p.value.Type().String());
			p.add(61);
			p.printValue((_struct = p.value, new reflect.Value.Ptr(_struct.typ, _struct.val, _struct.flag)), 118, false, false, 0);
		} else {
			(new ($ptrType(buffer))(function() { return p.buf; }, function(v$2) { p.buf = v$2; })).Write(nilAngleBytes);
		}
		p.add(41);
		p.erroring = false;
	};
	pp.prototype.badVerb = function(verb) { return this.$val.badVerb(verb); };
	pp.Ptr.prototype.fmtBool = function(v, verb) {
		var p, _ref;
		p = this;
		_ref = verb;
		if (_ref === 116 || _ref === 118) {
			p.fmt.fmt_boolean(v);
		} else {
			p.badVerb(verb);
		}
	};
	pp.prototype.fmtBool = function(v, verb) { return this.$val.fmtBool(v, verb); };
	pp.Ptr.prototype.fmtC = function(c) {
		var p, r, x, w;
		p = this;
		r = ((c.low + ((c.high >> 31) * 4294967296)) >> 0);
		if (!((x = new $Int64(0, r), (x.high === c.high && x.low === c.low)))) {
			r = 65533;
		}
		w = utf8.EncodeRune($subslice(new ($sliceType($Uint8))(p.runeBuf), 0, 4), r);
		p.fmt.pad($subslice(new ($sliceType($Uint8))(p.runeBuf), 0, w));
	};
	pp.prototype.fmtC = function(c) { return this.$val.fmtC(c); };
	pp.Ptr.prototype.fmtInt64 = function(v, verb) {
		var p, _ref;
		p = this;
		_ref = verb;
		if (_ref === 98) {
			p.fmt.integer(v, new $Uint64(0, 2), true, "0123456789abcdef");
		} else if (_ref === 99) {
			p.fmtC(v);
		} else if (_ref === 100 || _ref === 118) {
			p.fmt.integer(v, new $Uint64(0, 10), true, "0123456789abcdef");
		} else if (_ref === 111) {
			p.fmt.integer(v, new $Uint64(0, 8), true, "0123456789abcdef");
		} else if (_ref === 113) {
			if ((0 < v.high || (0 === v.high && 0 <= v.low)) && (v.high < 0 || (v.high === 0 && v.low <= 1114111))) {
				p.fmt.fmt_qc(v);
			} else {
				p.badVerb(verb);
			}
		} else if (_ref === 120) {
			p.fmt.integer(v, new $Uint64(0, 16), true, "0123456789abcdef");
		} else if (_ref === 85) {
			p.fmtUnicode(v);
		} else if (_ref === 88) {
			p.fmt.integer(v, new $Uint64(0, 16), true, "0123456789ABCDEF");
		} else {
			p.badVerb(verb);
		}
	};
	pp.prototype.fmtInt64 = function(v, verb) { return this.$val.fmtInt64(v, verb); };
	pp.Ptr.prototype.fmt0x64 = function(v, leading0x) {
		var p, sharp;
		p = this;
		sharp = p.fmt.sharp;
		p.fmt.sharp = leading0x;
		p.fmt.integer(new $Int64(v.high, v.low), new $Uint64(0, 16), false, "0123456789abcdef");
		p.fmt.sharp = sharp;
	};
	pp.prototype.fmt0x64 = function(v, leading0x) { return this.$val.fmt0x64(v, leading0x); };
	pp.Ptr.prototype.fmtUnicode = function(v) {
		var p, precPresent, sharp, prec;
		p = this;
		precPresent = p.fmt.precPresent;
		sharp = p.fmt.sharp;
		p.fmt.sharp = false;
		prec = p.fmt.prec;
		if (!precPresent) {
			p.fmt.prec = 4;
			p.fmt.precPresent = true;
		}
		p.fmt.unicode = true;
		p.fmt.uniQuote = sharp;
		p.fmt.integer(v, new $Uint64(0, 16), false, "0123456789ABCDEF");
		p.fmt.unicode = false;
		p.fmt.uniQuote = false;
		p.fmt.prec = prec;
		p.fmt.precPresent = precPresent;
		p.fmt.sharp = sharp;
	};
	pp.prototype.fmtUnicode = function(v) { return this.$val.fmtUnicode(v); };
	pp.Ptr.prototype.fmtUint64 = function(v, verb, goSyntax) {
		var p, _ref;
		p = this;
		_ref = verb;
		if (_ref === 98) {
			p.fmt.integer(new $Int64(v.high, v.low), new $Uint64(0, 2), false, "0123456789abcdef");
		} else if (_ref === 99) {
			p.fmtC(new $Int64(v.high, v.low));
		} else if (_ref === 100) {
			p.fmt.integer(new $Int64(v.high, v.low), new $Uint64(0, 10), false, "0123456789abcdef");
		} else if (_ref === 118) {
			if (goSyntax) {
				p.fmt0x64(v, true);
			} else {
				p.fmt.integer(new $Int64(v.high, v.low), new $Uint64(0, 10), false, "0123456789abcdef");
			}
		} else if (_ref === 111) {
			p.fmt.integer(new $Int64(v.high, v.low), new $Uint64(0, 8), false, "0123456789abcdef");
		} else if (_ref === 113) {
			if ((0 < v.high || (0 === v.high && 0 <= v.low)) && (v.high < 0 || (v.high === 0 && v.low <= 1114111))) {
				p.fmt.fmt_qc(new $Int64(v.high, v.low));
			} else {
				p.badVerb(verb);
			}
		} else if (_ref === 120) {
			p.fmt.integer(new $Int64(v.high, v.low), new $Uint64(0, 16), false, "0123456789abcdef");
		} else if (_ref === 88) {
			p.fmt.integer(new $Int64(v.high, v.low), new $Uint64(0, 16), false, "0123456789ABCDEF");
		} else if (_ref === 85) {
			p.fmtUnicode(new $Int64(v.high, v.low));
		} else {
			p.badVerb(verb);
		}
	};
	pp.prototype.fmtUint64 = function(v, verb, goSyntax) { return this.$val.fmtUint64(v, verb, goSyntax); };
	pp.Ptr.prototype.fmtFloat32 = function(v, verb) {
		var p, _ref;
		p = this;
		_ref = verb;
		if (_ref === 98) {
			p.fmt.fmt_fb32(v);
		} else if (_ref === 101) {
			p.fmt.fmt_e32(v);
		} else if (_ref === 69) {
			p.fmt.fmt_E32(v);
		} else if (_ref === 102) {
			p.fmt.fmt_f32(v);
		} else if (_ref === 103 || _ref === 118) {
			p.fmt.fmt_g32(v);
		} else if (_ref === 71) {
			p.fmt.fmt_G32(v);
		} else {
			p.badVerb(verb);
		}
	};
	pp.prototype.fmtFloat32 = function(v, verb) { return this.$val.fmtFloat32(v, verb); };
	pp.Ptr.prototype.fmtFloat64 = function(v, verb) {
		var p, _ref;
		p = this;
		_ref = verb;
		if (_ref === 98) {
			p.fmt.fmt_fb64(v);
		} else if (_ref === 101) {
			p.fmt.fmt_e64(v);
		} else if (_ref === 69) {
			p.fmt.fmt_E64(v);
		} else if (_ref === 102) {
			p.fmt.fmt_f64(v);
		} else if (_ref === 103 || _ref === 118) {
			p.fmt.fmt_g64(v);
		} else if (_ref === 71) {
			p.fmt.fmt_G64(v);
		} else {
			p.badVerb(verb);
		}
	};
	pp.prototype.fmtFloat64 = function(v, verb) { return this.$val.fmtFloat64(v, verb); };
	pp.Ptr.prototype.fmtComplex64 = function(v, verb) {
		var p, _ref;
		p = this;
		_ref = verb;
		if (_ref === 98 || _ref === 101 || _ref === 69 || _ref === 102 || _ref === 70 || _ref === 103 || _ref === 71) {
			p.fmt.fmt_c64(v, verb);
		} else if (_ref === 118) {
			p.fmt.fmt_c64(v, 103);
		} else {
			p.badVerb(verb);
		}
	};
	pp.prototype.fmtComplex64 = function(v, verb) { return this.$val.fmtComplex64(v, verb); };
	pp.Ptr.prototype.fmtComplex128 = function(v, verb) {
		var p, _ref;
		p = this;
		_ref = verb;
		if (_ref === 98 || _ref === 101 || _ref === 69 || _ref === 102 || _ref === 70 || _ref === 103 || _ref === 71) {
			p.fmt.fmt_c128(v, verb);
		} else if (_ref === 118) {
			p.fmt.fmt_c128(v, 103);
		} else {
			p.badVerb(verb);
		}
	};
	pp.prototype.fmtComplex128 = function(v, verb) { return this.$val.fmtComplex128(v, verb); };
	pp.Ptr.prototype.fmtString = function(v, verb, goSyntax) {
		var p, _ref;
		p = this;
		_ref = verb;
		if (_ref === 118) {
			if (goSyntax) {
				p.fmt.fmt_q(v);
			} else {
				p.fmt.fmt_s(v);
			}
		} else if (_ref === 115) {
			p.fmt.fmt_s(v);
		} else if (_ref === 120) {
			p.fmt.fmt_sx(v, "0123456789abcdef");
		} else if (_ref === 88) {
			p.fmt.fmt_sx(v, "0123456789ABCDEF");
		} else if (_ref === 113) {
			p.fmt.fmt_q(v);
		} else {
			p.badVerb(verb);
		}
	};
	pp.prototype.fmtString = function(v, verb, goSyntax) { return this.$val.fmtString(v, verb, goSyntax); };
	pp.Ptr.prototype.fmtBytes = function(v, verb, goSyntax, typ, depth) {
		var p, v$1, v$2, v$3, v$4, _ref, _i, c, i, v$5, v$6, v$7, v$8, _ref$1;
		p = this;
		if ((verb === 118) || (verb === 100)) {
			if (goSyntax) {
				if ($interfaceIsEqual(typ, null)) {
					(new ($ptrType(buffer))(function() { return p.buf; }, function(v$1) { p.buf = v$1; })).Write(bytesBytes);
				} else {
					(new ($ptrType(buffer))(function() { return p.buf; }, function(v$2) { p.buf = v$2; })).WriteString(typ.String());
					(new ($ptrType(buffer))(function() { return p.buf; }, function(v$3) { p.buf = v$3; })).WriteByte(123);
				}
			} else {
				(new ($ptrType(buffer))(function() { return p.buf; }, function(v$4) { p.buf = v$4; })).WriteByte(91);
			}
			_ref = v;
			_i = 0;
			while (_i < _ref.length) {
				c = ((_i < 0 || _i >= _ref.length) ? $throwRuntimeError("index out of range") : _ref.array[_ref.offset + _i]);
				i = _i;
				if (i > 0) {
					if (goSyntax) {
						(new ($ptrType(buffer))(function() { return p.buf; }, function(v$5) { p.buf = v$5; })).Write(commaSpaceBytes);
					} else {
						(new ($ptrType(buffer))(function() { return p.buf; }, function(v$6) { p.buf = v$6; })).WriteByte(32);
					}
				}
				p.printArg(new $Uint8(c), 118, p.fmt.plus, goSyntax, depth + 1 >> 0);
				_i++;
			}
			if (goSyntax) {
				(new ($ptrType(buffer))(function() { return p.buf; }, function(v$7) { p.buf = v$7; })).WriteByte(125);
			} else {
				(new ($ptrType(buffer))(function() { return p.buf; }, function(v$8) { p.buf = v$8; })).WriteByte(93);
			}
			return;
		}
		_ref$1 = verb;
		if (_ref$1 === 115) {
			p.fmt.fmt_s($bytesToString(v));
		} else if (_ref$1 === 120) {
			p.fmt.fmt_bx(v, "0123456789abcdef");
		} else if (_ref$1 === 88) {
			p.fmt.fmt_bx(v, "0123456789ABCDEF");
		} else if (_ref$1 === 113) {
			p.fmt.fmt_q($bytesToString(v));
		} else {
			p.badVerb(verb);
		}
	};
	pp.prototype.fmtBytes = function(v, verb, goSyntax, typ, depth) { return this.$val.fmtBytes(v, verb, goSyntax, typ, depth); };
	pp.Ptr.prototype.fmtPointer = function(value, verb, goSyntax) {
		var p, use0x64, _ref, u, _ref$1, v, v$1, v$2;
		p = this;
		use0x64 = true;
		_ref = verb;
		if (_ref === 112 || _ref === 118) {
		} else if (_ref === 98 || _ref === 100 || _ref === 111 || _ref === 120 || _ref === 88) {
			use0x64 = false;
		} else {
			p.badVerb(verb);
			return;
		}
		u = 0;
		_ref$1 = value.Kind();
		if (_ref$1 === 18 || _ref$1 === 19 || _ref$1 === 21 || _ref$1 === 22 || _ref$1 === 23 || _ref$1 === 26) {
			u = value.Pointer();
		} else {
			p.badVerb(verb);
			return;
		}
		if (goSyntax) {
			p.add(40);
			(new ($ptrType(buffer))(function() { return p.buf; }, function(v) { p.buf = v; })).WriteString(value.Type().String());
			p.add(41);
			p.add(40);
			if (u === 0) {
				(new ($ptrType(buffer))(function() { return p.buf; }, function(v$1) { p.buf = v$1; })).Write(nilBytes);
			} else {
				p.fmt0x64(new $Uint64(0, u.constructor === Number ? u : 1), true);
			}
			p.add(41);
		} else if ((verb === 118) && (u === 0)) {
			(new ($ptrType(buffer))(function() { return p.buf; }, function(v$2) { p.buf = v$2; })).Write(nilAngleBytes);
		} else {
			if (use0x64) {
				p.fmt0x64(new $Uint64(0, u.constructor === Number ? u : 1), !p.fmt.sharp);
			} else {
				p.fmtUint64(new $Uint64(0, u.constructor === Number ? u : 1), verb, false);
			}
		}
	};
	pp.prototype.fmtPointer = function(value, verb, goSyntax) { return this.$val.fmtPointer(value, verb, goSyntax); };
	pp.Ptr.prototype.catchPanic = function(arg, verb) {
		var p, err, _struct, v, v$1, v$2, v$3, v$4;
		p = this;
		err = $recover();
		if (!($interfaceIsEqual(err, null))) {
			v = (_struct = reflect.ValueOf(arg), new reflect.Value.Ptr(_struct.typ, _struct.val, _struct.flag));
			if ((v.Kind() === 22) && v.IsNil()) {
				(new ($ptrType(buffer))(function() { return p.buf; }, function(v$1) { p.buf = v$1; })).Write(nilAngleBytes);
				return;
			}
			if (p.panicking) {
				throw $panic(err);
			}
			(new ($ptrType(buffer))(function() { return p.buf; }, function(v$2) { p.buf = v$2; })).Write(percentBangBytes);
			p.add(verb);
			(new ($ptrType(buffer))(function() { return p.buf; }, function(v$3) { p.buf = v$3; })).Write(panicBytes);
			p.panicking = true;
			p.printArg(err, 118, false, false, 0);
			p.panicking = false;
			(new ($ptrType(buffer))(function() { return p.buf; }, function(v$4) { p.buf = v$4; })).WriteByte(41);
		}
	};
	pp.prototype.catchPanic = function(arg, verb) { return this.$val.catchPanic(arg, verb); };
	pp.Ptr.prototype.handleMethods = function(verb, plus, goSyntax, depth) {
		var wasString, handled, p, _tuple, x, formatter, ok, _tuple$1, x$1, stringer, ok$1, _ref, v, _ref$1, _type;
		wasString = false;
		handled = false;
		var $deferred = [];
		try {
			p = this;
			if (p.erroring) {
				return [wasString, handled];
			}
			_tuple = (x = p.arg, (x !== null && Formatter.implementedBy.indexOf(x.constructor) !== -1 ? [x, true] : [null, false])); formatter = _tuple[0]; ok = _tuple[1];
			if (ok) {
				handled = true;
				wasString = false;
				$deferred.push({ recv: p, method: "catchPanic", args: [p.arg, verb] });
				formatter.Format(p, verb);
				return [wasString, handled];
			}
			if (plus) {
				p.fmt.plus = false;
			}
			if (goSyntax) {
				p.fmt.sharp = false;
				_tuple$1 = (x$1 = p.arg, (x$1 !== null && GoStringer.implementedBy.indexOf(x$1.constructor) !== -1 ? [x$1, true] : [null, false])); stringer = _tuple$1[0]; ok$1 = _tuple$1[1];
				if (ok$1) {
					wasString = false;
					handled = true;
					$deferred.push({ recv: p, method: "catchPanic", args: [p.arg, verb] });
					p.fmtString(stringer.GoString(), 115, false);
					return [wasString, handled];
				}
			} else {
				_ref = verb;
				if (_ref === 118 || _ref === 115 || _ref === 120 || _ref === 88 || _ref === 113) {
					_ref$1 = p.arg;
					_type = _ref$1 !== null ? _ref$1.constructor : null;
					if ($error.implementedBy.indexOf(_type) !== -1) {
						v = _ref$1;
						wasString = false;
						handled = true;
						$deferred.push({ recv: p, method: "catchPanic", args: [p.arg, verb] });
						p.printArg(new $String(v.Error()), verb, plus, false, depth);
						return [wasString, handled];
					} else if (Stringer.implementedBy.indexOf(_type) !== -1) {
						v = _ref$1;
						wasString = false;
						handled = true;
						$deferred.push({ recv: p, method: "catchPanic", args: [p.arg, verb] });
						p.printArg(new $String(v.String()), verb, plus, false, depth);
						return [wasString, handled];
					}
				}
			}
			handled = false;
			return [wasString, handled];
		} catch($err) {
			$pushErr($err);
		} finally {
			$callDeferred($deferred);
			return [wasString, handled];
		}
	};
	pp.prototype.handleMethods = function(verb, plus, goSyntax, depth) { return this.$val.handleMethods(verb, plus, goSyntax, depth); };
	pp.Ptr.prototype.printArg = function(arg, verb, plus, goSyntax, depth) {
		var wasString, p, _ref, _struct, oldPlus, oldSharp, f, _ref$1, _type, _tuple, isString, handled, _struct$1;
		wasString = false;
		p = this;
		p.arg = arg;
		p.value = new reflect.Value.Ptr(($ptrType(reflect.rtype)).nil, 0, 0);
		if ($interfaceIsEqual(arg, null)) {
			if ((verb === 84) || (verb === 118)) {
				p.fmt.pad(nilAngleBytes);
			} else {
				p.badVerb(verb);
			}
			wasString = false;
			return wasString;
		}
		_ref = verb;
		if (_ref === 84) {
			p.printArg(new $String(reflect.TypeOf(arg).String()), 115, false, false, 0);
			wasString = false;
			return wasString;
		} else if (_ref === 112) {
			p.fmtPointer((_struct = reflect.ValueOf(arg), new reflect.Value.Ptr(_struct.typ, _struct.val, _struct.flag)), verb, goSyntax);
			wasString = false;
			return wasString;
		}
		oldPlus = p.fmt.plus;
		oldSharp = p.fmt.sharp;
		if (plus) {
			p.fmt.plus = false;
		}
		if (goSyntax) {
			p.fmt.sharp = false;
		}
		_ref$1 = arg;
		_type = _ref$1 !== null ? _ref$1.constructor : null;
		if (_type === $Bool) {
			f = _ref$1.$val;
			p.fmtBool(f, verb);
		} else if (_type === $Float32) {
			f = _ref$1.$val;
			p.fmtFloat32(f, verb);
		} else if (_type === $Float64) {
			f = _ref$1.$val;
			p.fmtFloat64(f, verb);
		} else if (_type === $Complex64) {
			f = _ref$1.$val;
			p.fmtComplex64(f, verb);
		} else if (_type === $Complex128) {
			f = _ref$1.$val;
			p.fmtComplex128(f, verb);
		} else if (_type === $Int) {
			f = _ref$1.$val;
			p.fmtInt64(new $Int64(0, f), verb);
		} else if (_type === $Int8) {
			f = _ref$1.$val;
			p.fmtInt64(new $Int64(0, f), verb);
		} else if (_type === $Int16) {
			f = _ref$1.$val;
			p.fmtInt64(new $Int64(0, f), verb);
		} else if (_type === $Int32) {
			f = _ref$1.$val;
			p.fmtInt64(new $Int64(0, f), verb);
		} else if (_type === $Int64) {
			f = _ref$1.$val;
			p.fmtInt64(f, verb);
		} else if (_type === $Uint) {
			f = _ref$1.$val;
			p.fmtUint64(new $Uint64(0, f), verb, goSyntax);
		} else if (_type === $Uint8) {
			f = _ref$1.$val;
			p.fmtUint64(new $Uint64(0, f), verb, goSyntax);
		} else if (_type === $Uint16) {
			f = _ref$1.$val;
			p.fmtUint64(new $Uint64(0, f), verb, goSyntax);
		} else if (_type === $Uint32) {
			f = _ref$1.$val;
			p.fmtUint64(new $Uint64(0, f), verb, goSyntax);
		} else if (_type === $Uint64) {
			f = _ref$1.$val;
			p.fmtUint64(f, verb, goSyntax);
		} else if (_type === $Uintptr) {
			f = _ref$1.$val;
			p.fmtUint64(new $Uint64(0, f.constructor === Number ? f : 1), verb, goSyntax);
		} else if (_type === $String) {
			f = _ref$1.$val;
			p.fmtString(f, verb, goSyntax);
			wasString = (verb === 115) || (verb === 118);
		} else if (_type === ($sliceType($Uint8))) {
			f = _ref$1.$val;
			p.fmtBytes(f, verb, goSyntax, null, depth);
			wasString = verb === 115;
		} else {
			f = _ref$1;
			p.fmt.plus = oldPlus;
			p.fmt.sharp = oldSharp;
			_tuple = p.handleMethods(verb, plus, goSyntax, depth); isString = _tuple[0]; handled = _tuple[1];
			if (handled) {
				wasString = isString;
				return wasString;
			}
			wasString = p.printReflectValue((_struct$1 = reflect.ValueOf(arg), new reflect.Value.Ptr(_struct$1.typ, _struct$1.val, _struct$1.flag)), verb, plus, goSyntax, depth);
			return wasString;
		}
		p.arg = null;
		return wasString;
	};
	pp.prototype.printArg = function(arg, verb, plus, goSyntax, depth) { return this.$val.printArg(arg, verb, plus, goSyntax, depth); };
	pp.Ptr.prototype.printValue = function(value, verb, plus, goSyntax, depth) {
		var wasString, p, v, _ref, _struct, _tuple, isString, handled, _struct$1;
		wasString = false;
		p = this;
		if (!value.IsValid()) {
			if ((verb === 84) || (verb === 118)) {
				(new ($ptrType(buffer))(function() { return p.buf; }, function(v) { p.buf = v; })).Write(nilAngleBytes);
			} else {
				p.badVerb(verb);
			}
			wasString = false;
			return wasString;
		}
		_ref = verb;
		if (_ref === 84) {
			p.printArg(new $String(value.Type().String()), 115, false, false, 0);
			wasString = false;
			return wasString;
		} else if (_ref === 112) {
			p.fmtPointer((_struct = value, new reflect.Value.Ptr(_struct.typ, _struct.val, _struct.flag)), verb, goSyntax);
			wasString = false;
			return wasString;
		}
		p.arg = null;
		if (value.CanInterface()) {
			p.arg = value.Interface();
		}
		_tuple = p.handleMethods(verb, plus, goSyntax, depth); isString = _tuple[0]; handled = _tuple[1];
		if (handled) {
			wasString = isString;
			return wasString;
		}
		wasString = p.printReflectValue((_struct$1 = value, new reflect.Value.Ptr(_struct$1.typ, _struct$1.val, _struct$1.flag)), verb, plus, goSyntax, depth);
		return wasString;
	};
	pp.prototype.printValue = function(value, verb, plus, goSyntax, depth) { return this.$val.printValue(value, verb, plus, goSyntax, depth); };
	pp.Ptr.prototype.printReflectValue = function(value, verb, plus, goSyntax, depth) {
		var wasString, p, _struct, oldValue, _struct$1, _struct$2, f, _ref, x, v, v$1, v$2, v$3, keys, _ref$1, _i, _struct$3, key, i, v$4, v$5, _struct$4, v$6, _struct$5, _struct$6, v$7, v$8, v$9, _struct$7, v$10, t, i$1, v$11, v$12, _struct$8, f$1, v$13, v$14, _struct$9, _struct$10, v$15, _struct$11, value$1, v$16, v$17, v$18, _struct$12, typ, bytes, _ref$2, _i$1, i$2, v$19, v$20, v$21, v$22, i$3, v$23, v$24, _struct$13, v$25, v$26, v$27, _struct$14, a, _ref$3, v$28, _struct$15, v$29, _struct$16, _struct$17, _struct$18, _struct$19;
		wasString = false;
		p = this;
		oldValue = (_struct = p.value, new reflect.Value.Ptr(_struct.typ, _struct.val, _struct.flag));
		p.value = (_struct$1 = value, new reflect.Value.Ptr(_struct$1.typ, _struct$1.val, _struct$1.flag));
		f = (_struct$2 = value, new reflect.Value.Ptr(_struct$2.typ, _struct$2.val, _struct$2.flag));
		_ref = f.Kind();
		BigSwitch:
		switch (0) { default: if (_ref === 1) {
			p.fmtBool(f.Bool(), verb);
		} else if (_ref === 2 || _ref === 3 || _ref === 4 || _ref === 5 || _ref === 6) {
			p.fmtInt64(f.Int(), verb);
		} else if (_ref === 7 || _ref === 8 || _ref === 9 || _ref === 10 || _ref === 11 || _ref === 12) {
			p.fmtUint64(f.Uint(), verb, goSyntax);
		} else if (_ref === 13 || _ref === 14) {
			if (f.Type().Size() === 4) {
				p.fmtFloat32(f.Float(), verb);
			} else {
				p.fmtFloat64(f.Float(), verb);
			}
		} else if (_ref === 15 || _ref === 16) {
			if (f.Type().Size() === 8) {
				p.fmtComplex64((x = f.Complex(), new $Complex64(x.real, x.imag)), verb);
			} else {
				p.fmtComplex128(f.Complex(), verb);
			}
		} else if (_ref === 24) {
			p.fmtString(f.String(), verb, goSyntax);
		} else if (_ref === 21) {
			if (goSyntax) {
				(new ($ptrType(buffer))(function() { return p.buf; }, function(v) { p.buf = v; })).WriteString(f.Type().String());
				if (f.IsNil()) {
					(new ($ptrType(buffer))(function() { return p.buf; }, function(v$1) { p.buf = v$1; })).WriteString("(nil)");
					break;
				}
				(new ($ptrType(buffer))(function() { return p.buf; }, function(v$2) { p.buf = v$2; })).WriteByte(123);
			} else {
				(new ($ptrType(buffer))(function() { return p.buf; }, function(v$3) { p.buf = v$3; })).Write(mapBytes);
			}
			keys = f.MapKeys();
			_ref$1 = keys;
			_i = 0;
			while (_i < _ref$1.length) {
				key = (_struct$3 = ((_i < 0 || _i >= _ref$1.length) ? $throwRuntimeError("index out of range") : _ref$1.array[_ref$1.offset + _i]), new reflect.Value.Ptr(_struct$3.typ, _struct$3.val, _struct$3.flag));
				i = _i;
				if (i > 0) {
					if (goSyntax) {
						(new ($ptrType(buffer))(function() { return p.buf; }, function(v$4) { p.buf = v$4; })).Write(commaSpaceBytes);
					} else {
						(new ($ptrType(buffer))(function() { return p.buf; }, function(v$5) { p.buf = v$5; })).WriteByte(32);
					}
				}
				p.printValue((_struct$4 = key, new reflect.Value.Ptr(_struct$4.typ, _struct$4.val, _struct$4.flag)), verb, plus, goSyntax, depth + 1 >> 0);
				(new ($ptrType(buffer))(function() { return p.buf; }, function(v$6) { p.buf = v$6; })).WriteByte(58);
				p.printValue((_struct$6 = f.MapIndex((_struct$5 = key, new reflect.Value.Ptr(_struct$5.typ, _struct$5.val, _struct$5.flag))), new reflect.Value.Ptr(_struct$6.typ, _struct$6.val, _struct$6.flag)), verb, plus, goSyntax, depth + 1 >> 0);
				_i++;
			}
			if (goSyntax) {
				(new ($ptrType(buffer))(function() { return p.buf; }, function(v$7) { p.buf = v$7; })).WriteByte(125);
			} else {
				(new ($ptrType(buffer))(function() { return p.buf; }, function(v$8) { p.buf = v$8; })).WriteByte(93);
			}
		} else if (_ref === 25) {
			if (goSyntax) {
				(new ($ptrType(buffer))(function() { return p.buf; }, function(v$9) { p.buf = v$9; })).WriteString(value.Type().String());
			}
			p.add(123);
			v$10 = (_struct$7 = f, new reflect.Value.Ptr(_struct$7.typ, _struct$7.val, _struct$7.flag));
			t = v$10.Type();
			i$1 = 0;
			while (i$1 < v$10.NumField()) {
				if (i$1 > 0) {
					if (goSyntax) {
						(new ($ptrType(buffer))(function() { return p.buf; }, function(v$11) { p.buf = v$11; })).Write(commaSpaceBytes);
					} else {
						(new ($ptrType(buffer))(function() { return p.buf; }, function(v$12) { p.buf = v$12; })).WriteByte(32);
					}
				}
				if (plus || goSyntax) {
					f$1 = (_struct$8 = t.Field(i$1), new reflect.StructField.Ptr(_struct$8.Name, _struct$8.PkgPath, _struct$8.Type, _struct$8.Tag, _struct$8.Offset, _struct$8.Index, _struct$8.Anonymous));
					if (!(f$1.Name === "")) {
						(new ($ptrType(buffer))(function() { return p.buf; }, function(v$13) { p.buf = v$13; })).WriteString(f$1.Name);
						(new ($ptrType(buffer))(function() { return p.buf; }, function(v$14) { p.buf = v$14; })).WriteByte(58);
					}
				}
				p.printValue((_struct$10 = getField((_struct$9 = v$10, new reflect.Value.Ptr(_struct$9.typ, _struct$9.val, _struct$9.flag)), i$1), new reflect.Value.Ptr(_struct$10.typ, _struct$10.val, _struct$10.flag)), verb, plus, goSyntax, depth + 1 >> 0);
				i$1 = i$1 + 1 >> 0;
			}
			(new ($ptrType(buffer))(function() { return p.buf; }, function(v$15) { p.buf = v$15; })).WriteByte(125);
		} else if (_ref === 20) {
			value$1 = (_struct$11 = f.Elem(), new reflect.Value.Ptr(_struct$11.typ, _struct$11.val, _struct$11.flag));
			if (!value$1.IsValid()) {
				if (goSyntax) {
					(new ($ptrType(buffer))(function() { return p.buf; }, function(v$16) { p.buf = v$16; })).WriteString(f.Type().String());
					(new ($ptrType(buffer))(function() { return p.buf; }, function(v$17) { p.buf = v$17; })).Write(nilParenBytes);
				} else {
					(new ($ptrType(buffer))(function() { return p.buf; }, function(v$18) { p.buf = v$18; })).Write(nilAngleBytes);
				}
			} else {
				wasString = p.printValue((_struct$12 = value$1, new reflect.Value.Ptr(_struct$12.typ, _struct$12.val, _struct$12.flag)), verb, plus, goSyntax, depth + 1 >> 0);
			}
		} else if (_ref === 17 || _ref === 23) {
			typ = f.Type();
			if (typ.Elem().Kind() === 8) {
				bytes = ($sliceType($Uint8)).nil;
				if (f.Kind() === 23) {
					bytes = f.Bytes();
				} else if (f.CanAddr()) {
					bytes = f.Slice(0, f.Len()).Bytes();
				} else {
					bytes = ($sliceType($Uint8)).make(f.Len(), 0, function() { return 0; });
					_ref$2 = bytes;
					_i$1 = 0;
					while (_i$1 < _ref$2.length) {
						i$2 = _i$1;
						(i$2 < 0 || i$2 >= bytes.length) ? $throwRuntimeError("index out of range") : bytes.array[bytes.offset + i$2] = (f.Index(i$2).Uint().low << 24 >>> 24);
						_i$1++;
					}
				}
				p.fmtBytes(bytes, verb, goSyntax, typ, depth);
				wasString = verb === 115;
				break;
			}
			if (goSyntax) {
				(new ($ptrType(buffer))(function() { return p.buf; }, function(v$19) { p.buf = v$19; })).WriteString(value.Type().String());
				if ((f.Kind() === 23) && f.IsNil()) {
					(new ($ptrType(buffer))(function() { return p.buf; }, function(v$20) { p.buf = v$20; })).WriteString("(nil)");
					break;
				}
				(new ($ptrType(buffer))(function() { return p.buf; }, function(v$21) { p.buf = v$21; })).WriteByte(123);
			} else {
				(new ($ptrType(buffer))(function() { return p.buf; }, function(v$22) { p.buf = v$22; })).WriteByte(91);
			}
			i$3 = 0;
			while (i$3 < f.Len()) {
				if (i$3 > 0) {
					if (goSyntax) {
						(new ($ptrType(buffer))(function() { return p.buf; }, function(v$23) { p.buf = v$23; })).Write(commaSpaceBytes);
					} else {
						(new ($ptrType(buffer))(function() { return p.buf; }, function(v$24) { p.buf = v$24; })).WriteByte(32);
					}
				}
				p.printValue((_struct$13 = f.Index(i$3), new reflect.Value.Ptr(_struct$13.typ, _struct$13.val, _struct$13.flag)), verb, plus, goSyntax, depth + 1 >> 0);
				i$3 = i$3 + 1 >> 0;
			}
			if (goSyntax) {
				(new ($ptrType(buffer))(function() { return p.buf; }, function(v$25) { p.buf = v$25; })).WriteByte(125);
			} else {
				(new ($ptrType(buffer))(function() { return p.buf; }, function(v$26) { p.buf = v$26; })).WriteByte(93);
			}
		} else if (_ref === 22) {
			v$27 = f.Pointer();
			if (!((v$27 === 0)) && (depth === 0)) {
				a = (_struct$14 = f.Elem(), new reflect.Value.Ptr(_struct$14.typ, _struct$14.val, _struct$14.flag));
				_ref$3 = a.Kind();
				if (_ref$3 === 17 || _ref$3 === 23) {
					(new ($ptrType(buffer))(function() { return p.buf; }, function(v$28) { p.buf = v$28; })).WriteByte(38);
					p.printValue((_struct$15 = a, new reflect.Value.Ptr(_struct$15.typ, _struct$15.val, _struct$15.flag)), verb, plus, goSyntax, depth + 1 >> 0);
					break BigSwitch;
				} else if (_ref$3 === 25) {
					(new ($ptrType(buffer))(function() { return p.buf; }, function(v$29) { p.buf = v$29; })).WriteByte(38);
					p.printValue((_struct$16 = a, new reflect.Value.Ptr(_struct$16.typ, _struct$16.val, _struct$16.flag)), verb, plus, goSyntax, depth + 1 >> 0);
					break BigSwitch;
				}
			}
			p.fmtPointer((_struct$17 = value, new reflect.Value.Ptr(_struct$17.typ, _struct$17.val, _struct$17.flag)), verb, goSyntax);
		} else if (_ref === 18 || _ref === 19 || _ref === 26) {
			p.fmtPointer((_struct$18 = value, new reflect.Value.Ptr(_struct$18.typ, _struct$18.val, _struct$18.flag)), verb, goSyntax);
		} else {
			p.unknownType(new f.constructor.Struct(f));
		} }
		p.value = (_struct$19 = oldValue, new reflect.Value.Ptr(_struct$19.typ, _struct$19.val, _struct$19.flag));
		wasString = wasString;
		return wasString;
	};
	pp.prototype.printReflectValue = function(value, verb, plus, goSyntax, depth) { return this.$val.printReflectValue(value, verb, plus, goSyntax, depth); };
	intFromArg = function(a, argNum) {
		var num, isInt, newArgNum, _tuple, x;
		num = 0;
		isInt = false;
		newArgNum = 0;
		newArgNum = argNum;
		if (argNum < a.length) {
			_tuple = (x = ((argNum < 0 || argNum >= a.length) ? $throwRuntimeError("index out of range") : a.array[a.offset + argNum]), (x !== null && x.constructor === $Int ? [x.$val, true] : [0, false])); num = _tuple[0]; isInt = _tuple[1];
			newArgNum = argNum + 1 >> 0;
		}
		return [num, isInt, newArgNum];
	};
	parseArgNumber = function(format) {
		var index, wid, ok, i, _tuple, width, ok$1, newi, _tmp, _tmp$1, _tmp$2, _tmp$3, _tmp$4, _tmp$5, _tmp$6, _tmp$7, _tmp$8;
		index = 0;
		wid = 0;
		ok = false;
		i = 1;
		while (i < format.length) {
			if (format.charCodeAt(i) === 93) {
				_tuple = parsenum(format, 1, i); width = _tuple[0]; ok$1 = _tuple[1]; newi = _tuple[2];
				if (!ok$1 || !((newi === i))) {
					_tmp = 0; _tmp$1 = i + 1 >> 0; _tmp$2 = false; index = _tmp; wid = _tmp$1; ok = _tmp$2;
					return [index, wid, ok];
				}
				_tmp$3 = width - 1 >> 0; _tmp$4 = i + 1 >> 0; _tmp$5 = true; index = _tmp$3; wid = _tmp$4; ok = _tmp$5;
				return [index, wid, ok];
			}
			i = i + 1 >> 0;
		}
		_tmp$6 = 0; _tmp$7 = 1; _tmp$8 = false; index = _tmp$6; wid = _tmp$7; ok = _tmp$8;
		return [index, wid, ok];
	};
	pp.Ptr.prototype.argNumber = function(argNum, format, i, numArgs) {
		var newArgNum, newi, found, p, _tmp, _tmp$1, _tmp$2, _tuple, index, wid, ok, _tmp$3, _tmp$4, _tmp$5, _tmp$6, _tmp$7, _tmp$8;
		newArgNum = 0;
		newi = 0;
		found = false;
		p = this;
		if (format.length <= i || !((format.charCodeAt(i) === 91))) {
			_tmp = argNum; _tmp$1 = i; _tmp$2 = false; newArgNum = _tmp; newi = _tmp$1; found = _tmp$2;
			return [newArgNum, newi, found];
		}
		p.reordered = true;
		_tuple = parseArgNumber(format.substring(i)); index = _tuple[0]; wid = _tuple[1]; ok = _tuple[2];
		if (ok && 0 <= index && index < numArgs) {
			_tmp$3 = index; _tmp$4 = i + wid >> 0; _tmp$5 = true; newArgNum = _tmp$3; newi = _tmp$4; found = _tmp$5;
			return [newArgNum, newi, found];
		}
		p.goodArgNum = false;
		_tmp$6 = argNum; _tmp$7 = i + wid >> 0; _tmp$8 = true; newArgNum = _tmp$6; newi = _tmp$7; found = _tmp$8;
		return [newArgNum, newi, found];
	};
	pp.prototype.argNumber = function(argNum, format, i, numArgs) { return this.$val.argNumber(argNum, format, i, numArgs); };
	pp.Ptr.prototype.doPrintf = function(format, a) {
		var p, end, argNum, afterIndex, i, lasti, v, _ref, _tuple, _tuple$1, v$1, _tuple$2, _tuple$3, _tuple$4, v$2, _tuple$5, _tuple$6, v$3, _tuple$7, c, w, v$4, v$5, v$6, v$7, v$8, arg, goSyntax, plus, v$9, arg$1, v$10, v$11, v$12, v$13;
		p = this;
		end = format.length;
		argNum = 0;
		afterIndex = false;
		p.reordered = false;
		i = 0;
		while (i < end) {
			p.goodArgNum = true;
			lasti = i;
			while (i < end && !((format.charCodeAt(i) === 37))) {
				i = i + 1 >> 0;
			}
			if (i > lasti) {
				(new ($ptrType(buffer))(function() { return p.buf; }, function(v) { p.buf = v; })).WriteString(format.substring(lasti, i));
			}
			if (i >= end) {
				break;
			}
			i = i + 1 >> 0;
			p.fmt.clearflags();
			F:
			while (i < end) {
				_ref = format.charCodeAt(i);
				if (_ref === 35) {
					p.fmt.sharp = true;
				} else if (_ref === 48) {
					p.fmt.zero = true;
				} else if (_ref === 43) {
					p.fmt.plus = true;
				} else if (_ref === 45) {
					p.fmt.minus = true;
				} else if (_ref === 32) {
					p.fmt.space = true;
				} else {
					break F;
				}
				i = i + 1 >> 0;
			}
			_tuple = p.argNumber(argNum, format, i, a.length); argNum = _tuple[0]; i = _tuple[1]; afterIndex = _tuple[2];
			if (i < end && (format.charCodeAt(i) === 42)) {
				i = i + 1 >> 0;
				_tuple$1 = intFromArg(a, argNum); p.fmt.wid = _tuple$1[0]; p.fmt.widPresent = _tuple$1[1]; argNum = _tuple$1[2];
				if (!p.fmt.widPresent) {
					(new ($ptrType(buffer))(function() { return p.buf; }, function(v$1) { p.buf = v$1; })).Write(badWidthBytes);
				}
				afterIndex = false;
			} else {
				_tuple$2 = parsenum(format, i, end); p.fmt.wid = _tuple$2[0]; p.fmt.widPresent = _tuple$2[1]; i = _tuple$2[2];
				if (afterIndex && p.fmt.widPresent) {
					p.goodArgNum = false;
				}
			}
			if ((i + 1 >> 0) < end && (format.charCodeAt(i) === 46)) {
				i = i + 1 >> 0;
				if (afterIndex) {
					p.goodArgNum = false;
				}
				_tuple$3 = p.argNumber(argNum, format, i, a.length); argNum = _tuple$3[0]; i = _tuple$3[1]; afterIndex = _tuple$3[2];
				if (format.charCodeAt(i) === 42) {
					i = i + 1 >> 0;
					_tuple$4 = intFromArg(a, argNum); p.fmt.prec = _tuple$4[0]; p.fmt.precPresent = _tuple$4[1]; argNum = _tuple$4[2];
					if (!p.fmt.precPresent) {
						(new ($ptrType(buffer))(function() { return p.buf; }, function(v$2) { p.buf = v$2; })).Write(badPrecBytes);
					}
					afterIndex = false;
				} else {
					_tuple$5 = parsenum(format, i, end); p.fmt.prec = _tuple$5[0]; p.fmt.precPresent = _tuple$5[1]; i = _tuple$5[2];
					if (!p.fmt.precPresent) {
						p.fmt.prec = 0;
						p.fmt.precPresent = true;
					}
				}
			}
			if (!afterIndex) {
				_tuple$6 = p.argNumber(argNum, format, i, a.length); argNum = _tuple$6[0]; i = _tuple$6[1]; afterIndex = _tuple$6[2];
			}
			if (i >= end) {
				(new ($ptrType(buffer))(function() { return p.buf; }, function(v$3) { p.buf = v$3; })).Write(noVerbBytes);
				continue;
			}
			_tuple$7 = utf8.DecodeRuneInString(format.substring(i)); c = _tuple$7[0]; w = _tuple$7[1];
			i = i + (w) >> 0;
			if (c === 37) {
				(new ($ptrType(buffer))(function() { return p.buf; }, function(v$4) { p.buf = v$4; })).WriteByte(37);
				continue;
			}
			if (!p.goodArgNum) {
				(new ($ptrType(buffer))(function() { return p.buf; }, function(v$5) { p.buf = v$5; })).Write(percentBangBytes);
				p.add(c);
				(new ($ptrType(buffer))(function() { return p.buf; }, function(v$6) { p.buf = v$6; })).Write(badIndexBytes);
				continue;
			} else if (argNum >= a.length) {
				(new ($ptrType(buffer))(function() { return p.buf; }, function(v$7) { p.buf = v$7; })).Write(percentBangBytes);
				p.add(c);
				(new ($ptrType(buffer))(function() { return p.buf; }, function(v$8) { p.buf = v$8; })).Write(missingBytes);
				continue;
			}
			arg = ((argNum < 0 || argNum >= a.length) ? $throwRuntimeError("index out of range") : a.array[a.offset + argNum]);
			argNum = argNum + 1 >> 0;
			goSyntax = (c === 118) && p.fmt.sharp;
			plus = (c === 118) && p.fmt.plus;
			p.printArg(arg, c, plus, goSyntax, 0);
		}
		if (!p.reordered && argNum < a.length) {
			(new ($ptrType(buffer))(function() { return p.buf; }, function(v$9) { p.buf = v$9; })).Write(extraBytes);
			while (argNum < a.length) {
				arg$1 = ((argNum < 0 || argNum >= a.length) ? $throwRuntimeError("index out of range") : a.array[a.offset + argNum]);
				if (!($interfaceIsEqual(arg$1, null))) {
					(new ($ptrType(buffer))(function() { return p.buf; }, function(v$10) { p.buf = v$10; })).WriteString(reflect.TypeOf(arg$1).String());
					(new ($ptrType(buffer))(function() { return p.buf; }, function(v$11) { p.buf = v$11; })).WriteByte(61);
				}
				p.printArg(arg$1, 118, false, false, 0);
				if ((argNum + 1 >> 0) < a.length) {
					(new ($ptrType(buffer))(function() { return p.buf; }, function(v$12) { p.buf = v$12; })).Write(commaSpaceBytes);
				}
				argNum = argNum + 1 >> 0;
			}
			(new ($ptrType(buffer))(function() { return p.buf; }, function(v$13) { p.buf = v$13; })).WriteByte(41);
		}
	};
	pp.prototype.doPrintf = function(format, a) { return this.$val.doPrintf(format, a); };
	ss.Ptr.prototype.Read = function(buf) {
		var n, err, s, _tmp, _tmp$1;
		n = 0;
		err = null;
		s = this;
		_tmp = 0; _tmp$1 = errors.New("ScanState's Read should not be called. Use ReadRune"); n = _tmp; err = _tmp$1;
		return [n, err];
	};
	ss.prototype.Read = function(buf) { return this.$val.Read(buf); };
	ss.Ptr.prototype.ReadRune = function() {
		var r, size, err, s, _tuple;
		r = 0;
		size = 0;
		err = null;
		s = this;
		if (s.peekRune >= 0) {
			s.count = s.count + 1 >> 0;
			r = s.peekRune;
			size = utf8.RuneLen(r);
			s.prevRune = r;
			s.peekRune = -1;
			return [r, size, err];
		}
		if (s.atEOF || s.ssave.nlIsEnd && (s.prevRune === 10) || s.count >= s.ssave.argLimit) {
			err = io.EOF;
			return [r, size, err];
		}
		_tuple = s.rr.ReadRune(); r = _tuple[0]; size = _tuple[1]; err = _tuple[2];
		if ($interfaceIsEqual(err, null)) {
			s.count = s.count + 1 >> 0;
			s.prevRune = r;
		} else if ($interfaceIsEqual(err, io.EOF)) {
			s.atEOF = true;
		}
		return [r, size, err];
	};
	ss.prototype.ReadRune = function() { return this.$val.ReadRune(); };
	ss.Ptr.prototype.Width = function() {
		var wid, ok, s, _tmp, _tmp$1, _tmp$2, _tmp$3;
		wid = 0;
		ok = false;
		s = this;
		if (s.ssave.maxWid === 1073741824) {
			_tmp = 0; _tmp$1 = false; wid = _tmp; ok = _tmp$1;
			return [wid, ok];
		}
		_tmp$2 = s.ssave.maxWid; _tmp$3 = true; wid = _tmp$2; ok = _tmp$3;
		return [wid, ok];
	};
	ss.prototype.Width = function() { return this.$val.Width(); };
	ss.Ptr.prototype.getRune = function() {
		var r, s, _tuple, err;
		r = 0;
		s = this;
		_tuple = s.ReadRune(); r = _tuple[0]; err = _tuple[2];
		if (!($interfaceIsEqual(err, null))) {
			if ($interfaceIsEqual(err, io.EOF)) {
				r = -1;
				return r;
			}
			s.error(err);
		}
		return r;
	};
	ss.prototype.getRune = function() { return this.$val.getRune(); };
	ss.Ptr.prototype.UnreadRune = function() {
		var s, _tuple, x, u, ok;
		s = this;
		_tuple = (x = s.rr, (x !== null && runeUnreader.implementedBy.indexOf(x.constructor) !== -1 ? [x, true] : [null, false])); u = _tuple[0]; ok = _tuple[1];
		if (ok) {
			u.UnreadRune();
		} else {
			s.peekRune = s.prevRune;
		}
		s.prevRune = -1;
		s.count = s.count - 1 >> 0;
		return null;
	};
	ss.prototype.UnreadRune = function() { return this.$val.UnreadRune(); };
	ss.Ptr.prototype.error = function(err) {
		var s, x;
		s = this;
		throw $panic((x = new scanError.Ptr(err), new x.constructor.Struct(x)));
	};
	ss.prototype.error = function(err) { return this.$val.error(err); };
	ss.Ptr.prototype.errorString = function(err) {
		var s, x;
		s = this;
		throw $panic((x = new scanError.Ptr(errors.New(err)), new x.constructor.Struct(x)));
	};
	ss.prototype.errorString = function(err) { return this.$val.errorString(err); };
	ss.Ptr.prototype.Token = function(skipSpace, f) {
		var tok, err, s;
		tok = ($sliceType($Uint8)).nil;
		err = null;
		var $deferred = [];
		try {
			s = this;
			$deferred.push({ fun: (function() {
				var e, _tuple, _struct, se, ok;
				e = $recover();
				if (!($interfaceIsEqual(e, null))) {
					_tuple = (e !== null && e.constructor === scanError ? [e.$val, true] : [new scanError.Ptr(), false]); se = (_struct = _tuple[0], new scanError.Ptr(_struct.err)); ok = _tuple[1];
					if (ok) {
						err = se.err;
					} else {
						throw $panic(e);
					}
				}
			}), args: [] });
			if (f === $throwNilPointerError) {
				f = notSpace;
			}
			s.buf = $subslice(s.buf, 0, 0);
			tok = s.token(skipSpace, f);
			return [tok, err];
		} catch($err) {
			$pushErr($err);
		} finally {
			$callDeferred($deferred);
			return [tok, err];
		}
	};
	ss.prototype.Token = function(skipSpace, f) { return this.$val.Token(skipSpace, f); };
	isSpace = function(r) {
		var rx, _ref, _i, rng;
		if (r >= 65536) {
			return false;
		}
		rx = (r << 16 >>> 16);
		_ref = space;
		_i = 0;
		while (_i < _ref.length) {
			rng = $mapArray(((_i < 0 || _i >= _ref.length) ? $throwRuntimeError("index out of range") : _ref.array[_ref.offset + _i]), function(entry) { return entry; });
			if (rx < rng[0]) {
				return false;
			}
			if (rx <= rng[1]) {
				return true;
			}
			_i++;
		}
		return false;
	};
	notSpace = function(r) {
		return !isSpace(r);
	};
	ss.Ptr.prototype.SkipSpace = function() {
		var s;
		s = this;
		s.skipSpace(false);
	};
	ss.prototype.SkipSpace = function() { return this.$val.SkipSpace(); };
	ss.Ptr.prototype.free = function(old) {
		var s, _struct;
		s = this;
		if (old.validSave) {
			s.ssave = (_struct = old, new ssave.Ptr(_struct.validSave, _struct.nlIsEnd, _struct.nlIsSpace, _struct.argLimit, _struct.limit, _struct.maxWid));
			return;
		}
		if (s.buf.capacity > 1024) {
			return;
		}
		s.buf = $subslice(s.buf, 0, 0);
		s.rr = null;
		ssFree.put(s);
	};
	ss.prototype.free = function(old) { return this.$val.free(old); };
	ss.Ptr.prototype.skipSpace = function(stopAtNewline) {
		var s, r;
		s = this;
		while (true) {
			r = s.getRune();
			if (r === -1) {
				return;
			}
			if ((r === 13) && s.peek("\n")) {
				continue;
			}
			if (r === 10) {
				if (stopAtNewline) {
					break;
				}
				if (s.ssave.nlIsSpace) {
					continue;
				}
				s.errorString("unexpected newline");
				return;
			}
			if (!isSpace(r)) {
				s.UnreadRune();
				break;
			}
		}
	};
	ss.prototype.skipSpace = function(stopAtNewline) { return this.$val.skipSpace(stopAtNewline); };
	ss.Ptr.prototype.token = function(skipSpace, f) {
		var s, r, v, x;
		s = this;
		if (skipSpace) {
			s.skipSpace(false);
		}
		while (true) {
			r = s.getRune();
			if (r === -1) {
				break;
			}
			if (!f(r)) {
				s.UnreadRune();
				break;
			}
			(new ($ptrType(buffer))(function() { return s.buf; }, function(v) { s.buf = v; })).WriteRune(r);
		}
		return (x = s.buf, $subslice(new ($sliceType($Uint8))(x.array), x.offset, x.offset + x.length));
	};
	ss.prototype.token = function(skipSpace, f) { return this.$val.token(skipSpace, f); };
	indexRune = function(s, r) {
		var _ref, _i, _rune, c, i;
		_ref = s;
		_i = 0;
		while (_i < _ref.length) {
			_rune = $decodeRune(_ref, _i);
			c = _rune[0];
			i = _i;
			if (c === r) {
				return i;
			}
			_i += _rune[1];
		}
		return -1;
	};
	ss.Ptr.prototype.peek = function(ok) {
		var s, r;
		s = this;
		r = s.getRune();
		if (!((r === -1))) {
			s.UnreadRune();
		}
		return indexRune(ok, r) >= 0;
	};
	ss.prototype.peek = function(ok) { return this.$val.peek(ok); };
	$pkg.init = function() {
		($ptrType(fmt)).methods = [["clearflags", "clearflags", "fmt", [], [], false, -1], ["computePadding", "computePadding", "fmt", [$Int], [($sliceType($Uint8)), $Int, $Int], false, -1], ["fmt_E32", "fmt_E32", "fmt", [$Float32], [], false, -1], ["fmt_E64", "fmt_E64", "fmt", [$Float64], [], false, -1], ["fmt_G32", "fmt_G32", "fmt", [$Float32], [], false, -1], ["fmt_G64", "fmt_G64", "fmt", [$Float64], [], false, -1], ["fmt_boolean", "fmt_boolean", "fmt", [$Bool], [], false, -1], ["fmt_bx", "fmt_bx", "fmt", [($sliceType($Uint8)), $String], [], false, -1], ["fmt_c128", "fmt_c128", "fmt", [$Complex128, $Int32], [], false, -1], ["fmt_c64", "fmt_c64", "fmt", [$Complex64, $Int32], [], false, -1], ["fmt_e32", "fmt_e32", "fmt", [$Float32], [], false, -1], ["fmt_e64", "fmt_e64", "fmt", [$Float64], [], false, -1], ["fmt_f32", "fmt_f32", "fmt", [$Float32], [], false, -1], ["fmt_f64", "fmt_f64", "fmt", [$Float64], [], false, -1], ["fmt_fb32", "fmt_fb32", "fmt", [$Float32], [], false, -1], ["fmt_fb64", "fmt_fb64", "fmt", [$Float64], [], false, -1], ["fmt_g32", "fmt_g32", "fmt", [$Float32], [], false, -1], ["fmt_g64", "fmt_g64", "fmt", [$Float64], [], false, -1], ["fmt_q", "fmt_q", "fmt", [$String], [], false, -1], ["fmt_qc", "fmt_qc", "fmt", [$Int64], [], false, -1], ["fmt_s", "fmt_s", "fmt", [$String], [], false, -1], ["fmt_sbx", "fmt_sbx", "fmt", [$String, ($sliceType($Uint8)), $String], [], false, -1], ["fmt_sx", "fmt_sx", "fmt", [$String, $String], [], false, -1], ["formatFloat", "formatFloat", "fmt", [$Float64, $Uint8, $Int, $Int], [], false, -1], ["init", "init", "fmt", [($ptrType(buffer))], [], false, -1], ["integer", "integer", "fmt", [$Int64, $Uint64, $Bool, $String], [], false, -1], ["pad", "pad", "fmt", [($sliceType($Uint8))], [], false, -1], ["padString", "padString", "fmt", [$String], [], false, -1], ["truncate", "truncate", "fmt", [$String], [$String], false, -1], ["writePadding", "writePadding", "fmt", [$Int, ($sliceType($Uint8))], [], false, -1]];
		fmt.init([["intbuf", "intbuf", "fmt", ($arrayType($Uint8, 65)), ""], ["buf", "buf", "fmt", ($ptrType(buffer)), ""], ["wid", "wid", "fmt", $Int, ""], ["prec", "prec", "fmt", $Int, ""], ["widPresent", "widPresent", "fmt", $Bool, ""], ["precPresent", "precPresent", "fmt", $Bool, ""], ["minus", "minus", "fmt", $Bool, ""], ["plus", "plus", "fmt", $Bool, ""], ["sharp", "sharp", "fmt", $Bool, ""], ["space", "space", "fmt", $Bool, ""], ["unicode", "unicode", "fmt", $Bool, ""], ["uniQuote", "uniQuote", "fmt", $Bool, ""], ["zero", "zero", "fmt", $Bool, ""]]);
		State.init([["Flag", "Flag", "", [$Int], [$Bool], false], ["Precision", "Precision", "", [], [$Int, $Bool], false], ["Width", "Width", "", [], [$Int, $Bool], false], ["Write", "Write", "", [($sliceType($Uint8))], [$Int, $error], false]]);
		Formatter.init([["Format", "Format", "", [State, $Int32], [], false]]);
		Stringer.init([["String", "String", "", [], [$String], false]]);
		GoStringer.init([["GoString", "GoString", "", [], [$String], false]]);
		($ptrType(buffer)).methods = [["Write", "Write", "", [($sliceType($Uint8))], [$Int, $error], false, -1], ["WriteByte", "WriteByte", "", [$Uint8], [$error], false, -1], ["WriteRune", "WriteRune", "", [$Int32], [$error], false, -1], ["WriteString", "WriteString", "", [$String], [$Int, $error], false, -1]];
		buffer.init($Uint8);
		($ptrType(pp)).methods = [["Flag", "Flag", "", [$Int], [$Bool], false, -1], ["Precision", "Precision", "", [], [$Int, $Bool], false, -1], ["Width", "Width", "", [], [$Int, $Bool], false, -1], ["Write", "Write", "", [($sliceType($Uint8))], [$Int, $error], false, -1], ["add", "add", "fmt", [$Int32], [], false, -1], ["argNumber", "argNumber", "fmt", [$Int, $String, $Int, $Int], [$Int, $Int, $Bool], false, -1], ["badVerb", "badVerb", "fmt", [$Int32], [], false, -1], ["catchPanic", "catchPanic", "fmt", [$emptyInterface, $Int32], [], false, -1], ["doPrint", "doPrint", "fmt", [($sliceType($emptyInterface)), $Bool, $Bool], [], false, -1], ["doPrintf", "doPrintf", "fmt", [$String, ($sliceType($emptyInterface))], [], false, -1], ["fmt0x64", "fmt0x64", "fmt", [$Uint64, $Bool], [], false, -1], ["fmtBool", "fmtBool", "fmt", [$Bool, $Int32], [], false, -1], ["fmtBytes", "fmtBytes", "fmt", [($sliceType($Uint8)), $Int32, $Bool, reflect.Type, $Int], [], false, -1], ["fmtC", "fmtC", "fmt", [$Int64], [], false, -1], ["fmtComplex128", "fmtComplex128", "fmt", [$Complex128, $Int32], [], false, -1], ["fmtComplex64", "fmtComplex64", "fmt", [$Complex64, $Int32], [], false, -1], ["fmtFloat32", "fmtFloat32", "fmt", [$Float32, $Int32], [], false, -1], ["fmtFloat64", "fmtFloat64", "fmt", [$Float64, $Int32], [], false, -1], ["fmtInt64", "fmtInt64", "fmt", [$Int64, $Int32], [], false, -1], ["fmtPointer", "fmtPointer", "fmt", [reflect.Value, $Int32, $Bool], [], false, -1], ["fmtString", "fmtString", "fmt", [$String, $Int32, $Bool], [], false, -1], ["fmtUint64", "fmtUint64", "fmt", [$Uint64, $Int32, $Bool], [], false, -1], ["fmtUnicode", "fmtUnicode", "fmt", [$Int64], [], false, -1], ["free", "free", "fmt", [], [], false, -1], ["handleMethods", "handleMethods", "fmt", [$Int32, $Bool, $Bool, $Int], [$Bool, $Bool], false, -1], ["printArg", "printArg", "fmt", [$emptyInterface, $Int32, $Bool, $Bool, $Int], [$Bool], false, -1], ["printReflectValue", "printReflectValue", "fmt", [reflect.Value, $Int32, $Bool, $Bool, $Int], [$Bool], false, -1], ["printValue", "printValue", "fmt", [reflect.Value, $Int32, $Bool, $Bool, $Int], [$Bool], false, -1], ["unknownType", "unknownType", "fmt", [$emptyInterface], [], false, -1]];
		pp.init([["n", "n", "fmt", $Int, ""], ["panicking", "panicking", "fmt", $Bool, ""], ["erroring", "erroring", "fmt", $Bool, ""], ["buf", "buf", "fmt", buffer, ""], ["arg", "arg", "fmt", $emptyInterface, ""], ["value", "value", "fmt", reflect.Value, ""], ["reordered", "reordered", "fmt", $Bool, ""], ["goodArgNum", "goodArgNum", "fmt", $Bool, ""], ["runeBuf", "runeBuf", "fmt", ($arrayType($Uint8, 4)), ""], ["fmt", "fmt", "fmt", fmt, ""]]);
		($ptrType(cache)).methods = [["get", "get", "fmt", [], [$emptyInterface], false, -1], ["put", "put", "fmt", [$emptyInterface], [], false, -1]];
		cache.init([["mu", "mu", "fmt", sync.Mutex, ""], ["saved", "saved", "fmt", ($sliceType($emptyInterface)), ""], ["new$2", "new", "fmt", ($funcType([], [$emptyInterface], false)), ""]]);
		runeUnreader.init([["UnreadRune", "UnreadRune", "", [], [$error], false]]);
		scanError.init([["err", "err", "fmt", $error, ""]]);
		($ptrType(ss)).methods = [["Read", "Read", "", [($sliceType($Uint8))], [$Int, $error], false, -1], ["ReadRune", "ReadRune", "", [], [$Int32, $Int, $error], false, -1], ["SkipSpace", "SkipSpace", "", [], [], false, -1], ["Token", "Token", "", [$Bool, ($funcType([$Int32], [$Bool], false))], [($sliceType($Uint8)), $error], false, -1], ["UnreadRune", "UnreadRune", "", [], [$error], false, -1], ["Width", "Width", "", [], [$Int, $Bool], false, -1], ["accept", "accept", "fmt", [$String], [$Bool], false, -1], ["advance", "advance", "fmt", [$String], [$Int], false, -1], ["complexTokens", "complexTokens", "fmt", [], [$String, $String], false, -1], ["consume", "consume", "fmt", [$String, $Bool], [$Bool], false, -1], ["convertFloat", "convertFloat", "fmt", [$String, $Int], [$Float64], false, -1], ["convertString", "convertString", "fmt", [$Int32], [$String], false, -1], ["doScan", "doScan", "fmt", [($sliceType($emptyInterface))], [$Int, $error], false, -1], ["doScanf", "doScanf", "fmt", [$String, ($sliceType($emptyInterface))], [$Int, $error], false, -1], ["error", "error", "fmt", [$error], [], false, -1], ["errorString", "errorString", "fmt", [$String], [], false, -1], ["floatToken", "floatToken", "fmt", [], [$String], false, -1], ["free", "free", "fmt", [ssave], [], false, -1], ["getBase", "getBase", "fmt", [$Int32], [$Int, $String], false, -1], ["getRune", "getRune", "fmt", [], [$Int32], false, -1], ["hexByte", "hexByte", "fmt", [], [$Uint8, $Bool], false, -1], ["hexDigit", "hexDigit", "fmt", [$Int32], [$Int], false, -1], ["hexString", "hexString", "fmt", [], [$String], false, -1], ["mustReadRune", "mustReadRune", "fmt", [], [$Int32], false, -1], ["notEOF", "notEOF", "fmt", [], [], false, -1], ["okVerb", "okVerb", "fmt", [$Int32, $String, $String], [$Bool], false, -1], ["peek", "peek", "fmt", [$String], [$Bool], false, -1], ["quotedString", "quotedString", "fmt", [], [$String], false, -1], ["scanBasePrefix", "scanBasePrefix", "fmt", [], [$Int, $String, $Bool], false, -1], ["scanBool", "scanBool", "fmt", [$Int32], [$Bool], false, -1], ["scanComplex", "scanComplex", "fmt", [$Int32, $Int], [$Complex128], false, -1], ["scanInt", "scanInt", "fmt", [$Int32, $Int], [$Int64], false, -1], ["scanNumber", "scanNumber", "fmt", [$String, $Bool], [$String], false, -1], ["scanOne", "scanOne", "fmt", [$Int32, $emptyInterface], [], false, -1], ["scanRune", "scanRune", "fmt", [$Int], [$Int64], false, -1], ["scanUint", "scanUint", "fmt", [$Int32, $Int], [$Uint64], false, -1], ["skipSpace", "skipSpace", "fmt", [$Bool], [], false, -1], ["token", "token", "fmt", [$Bool, ($funcType([$Int32], [$Bool], false))], [($sliceType($Uint8))], false, -1]];
		ss.init([["rr", "rr", "fmt", io.RuneReader, ""], ["buf", "buf", "fmt", buffer, ""], ["peekRune", "peekRune", "fmt", $Int32, ""], ["prevRune", "prevRune", "fmt", $Int32, ""], ["count", "count", "fmt", $Int, ""], ["atEOF", "atEOF", "fmt", $Bool, ""], ["ssave", "", "fmt", ssave, ""]]);
		ssave.init([["validSave", "validSave", "fmt", $Bool, ""], ["nlIsEnd", "nlIsEnd", "fmt", $Bool, ""], ["nlIsSpace", "nlIsSpace", "fmt", $Bool, ""], ["argLimit", "argLimit", "fmt", $Int, ""], ["limit", "limit", "fmt", $Int, ""], ["maxWid", "maxWid", "fmt", $Int, ""]]);
		padZeroBytes = ($sliceType($Uint8)).make(65, 0, function() { return 0; });
		padSpaceBytes = ($sliceType($Uint8)).make(65, 0, function() { return 0; });
		trueBytes = new ($sliceType($Uint8))($stringToBytes("true"));
		falseBytes = new ($sliceType($Uint8))($stringToBytes("false"));
		commaSpaceBytes = new ($sliceType($Uint8))($stringToBytes(", "));
		nilAngleBytes = new ($sliceType($Uint8))($stringToBytes("<nil>"));
		nilParenBytes = new ($sliceType($Uint8))($stringToBytes("(nil)"));
		nilBytes = new ($sliceType($Uint8))($stringToBytes("nil"));
		mapBytes = new ($sliceType($Uint8))($stringToBytes("map["));
		percentBangBytes = new ($sliceType($Uint8))($stringToBytes("%!"));
		missingBytes = new ($sliceType($Uint8))($stringToBytes("(MISSING)"));
		badIndexBytes = new ($sliceType($Uint8))($stringToBytes("(BADINDEX)"));
		panicBytes = new ($sliceType($Uint8))($stringToBytes("(PANIC="));
		extraBytes = new ($sliceType($Uint8))($stringToBytes("%!(EXTRA "));
		irparenBytes = new ($sliceType($Uint8))($stringToBytes("i)"));
		bytesBytes = new ($sliceType($Uint8))($stringToBytes("[]byte{"));
		badWidthBytes = new ($sliceType($Uint8))($stringToBytes("%!(BADWIDTH)"));
		badPrecBytes = new ($sliceType($Uint8))($stringToBytes("%!(BADPREC)"));
		noVerbBytes = new ($sliceType($Uint8))($stringToBytes("%!(NOVERB)"));
		ppFree = newCache((function() {
			return new pp.Ptr();
		}));
		intBits = reflect.TypeOf(new $Int(0)).Bits();
		uintptrBits = reflect.TypeOf(new $Uintptr(0)).Bits();
		space = new ($sliceType(($arrayType($Uint16, 2))))([$toNativeArray("Uint16", [9, 13]), $toNativeArray("Uint16", [32, 32]), $toNativeArray("Uint16", [133, 133]), $toNativeArray("Uint16", [160, 160]), $toNativeArray("Uint16", [5760, 5760]), $toNativeArray("Uint16", [6158, 6158]), $toNativeArray("Uint16", [8192, 8202]), $toNativeArray("Uint16", [8232, 8233]), $toNativeArray("Uint16", [8239, 8239]), $toNativeArray("Uint16", [8287, 8287]), $toNativeArray("Uint16", [12288, 12288])]);
		ssFree = newCache((function() {
			return new ss.Ptr();
		}));
		complexError = errors.New("syntax error scanning complex number");
		boolError = errors.New("syntax error scanning boolean");
		var i;
		i = 0;
		while (i < 65) {
			(i < 0 || i >= padZeroBytes.length) ? $throwRuntimeError("index out of range") : padZeroBytes.array[padZeroBytes.offset + i] = 48;
			(i < 0 || i >= padSpaceBytes.length) ? $throwRuntimeError("index out of range") : padSpaceBytes.array[padSpaceBytes.offset + i] = 32;
			i = i + 1 >> 0;
		}
	};
	return $pkg;
})();
$packages["sort"] = (function() {
	var $pkg = {}, min, insertionSort, siftDown, heapSort, medianOfThree, swapRange, doPivot, quickSort, Sort;
	min = function(a, b) {
		if (a < b) {
			return a;
		}
		return b;
	};
	insertionSort = function(data, a, b) {
		var i, j;
		i = a + 1 >> 0;
		while (i < b) {
			j = i;
			while (j > a && data.Less(j, j - 1 >> 0)) {
				data.Swap(j, j - 1 >> 0);
				j = j - 1 >> 0;
			}
			i = i + 1 >> 0;
		}
	};
	siftDown = function(data, lo, hi, first) {
		var root, child;
		root = lo;
		while (true) {
			child = ((((2 >>> 16 << 16) * root >> 0) + (2 << 16 >>> 16) * root) >> 0) + 1 >> 0;
			if (child >= hi) {
				break;
			}
			if ((child + 1 >> 0) < hi && data.Less(first + child >> 0, (first + child >> 0) + 1 >> 0)) {
				child = child + 1 >> 0;
			}
			if (!data.Less(first + root >> 0, first + child >> 0)) {
				return;
			}
			data.Swap(first + root >> 0, first + child >> 0);
			root = child;
		}
	};
	heapSort = function(data, a, b) {
		var first, lo, hi, _q, i, i$1;
		first = a;
		lo = 0;
		hi = b - a >> 0;
		i = (_q = ((hi - 1 >> 0)) / 2, (_q === _q && _q !== 1/0 && _q !== -1/0) ? _q >> 0 : $throwRuntimeError("integer divide by zero"));
		while (i >= 0) {
			siftDown(data, i, hi, first);
			i = i - 1 >> 0;
		}
		i$1 = hi - 1 >> 0;
		while (i$1 >= 0) {
			data.Swap(first, first + i$1 >> 0);
			siftDown(data, lo, i$1, first);
			i$1 = i$1 - 1 >> 0;
		}
	};
	medianOfThree = function(data, a, b, c) {
		var m0, m1, m2;
		m0 = b;
		m1 = a;
		m2 = c;
		if (data.Less(m1, m0)) {
			data.Swap(m1, m0);
		}
		if (data.Less(m2, m1)) {
			data.Swap(m2, m1);
		}
		if (data.Less(m1, m0)) {
			data.Swap(m1, m0);
		}
	};
	swapRange = function(data, a, b, n) {
		var i;
		i = 0;
		while (i < n) {
			data.Swap(a + i >> 0, b + i >> 0);
			i = i + 1 >> 0;
		}
	};
	doPivot = function(data, lo, hi) {
		var midlo, midhi, _q, m, _q$1, s, pivot, _tmp, _tmp$1, _tmp$2, _tmp$3, a, b, c, d, n, _tmp$4, _tmp$5;
		midlo = 0;
		midhi = 0;
		m = lo + (_q = ((hi - lo >> 0)) / 2, (_q === _q && _q !== 1/0 && _q !== -1/0) ? _q >> 0 : $throwRuntimeError("integer divide by zero")) >> 0;
		if ((hi - lo >> 0) > 40) {
			s = (_q$1 = ((hi - lo >> 0)) / 8, (_q$1 === _q$1 && _q$1 !== 1/0 && _q$1 !== -1/0) ? _q$1 >> 0 : $throwRuntimeError("integer divide by zero"));
			medianOfThree(data, lo, lo + s >> 0, lo + ((((2 >>> 16 << 16) * s >> 0) + (2 << 16 >>> 16) * s) >> 0) >> 0);
			medianOfThree(data, m, m - s >> 0, m + s >> 0);
			medianOfThree(data, hi - 1 >> 0, (hi - 1 >> 0) - s >> 0, (hi - 1 >> 0) - ((((2 >>> 16 << 16) * s >> 0) + (2 << 16 >>> 16) * s) >> 0) >> 0);
		}
		medianOfThree(data, lo, m, hi - 1 >> 0);
		pivot = lo;
		_tmp = lo + 1 >> 0; _tmp$1 = lo + 1 >> 0; _tmp$2 = hi; _tmp$3 = hi; a = _tmp; b = _tmp$1; c = _tmp$2; d = _tmp$3;
		while (true) {
			while (b < c) {
				if (data.Less(b, pivot)) {
					b = b + 1 >> 0;
				} else if (!data.Less(pivot, b)) {
					data.Swap(a, b);
					a = a + 1 >> 0;
					b = b + 1 >> 0;
				} else {
					break;
				}
			}
			while (b < c) {
				if (data.Less(pivot, c - 1 >> 0)) {
					c = c - 1 >> 0;
				} else if (!data.Less(c - 1 >> 0, pivot)) {
					data.Swap(c - 1 >> 0, d - 1 >> 0);
					c = c - 1 >> 0;
					d = d - 1 >> 0;
				} else {
					break;
				}
			}
			if (b >= c) {
				break;
			}
			data.Swap(b, c - 1 >> 0);
			b = b + 1 >> 0;
			c = c - 1 >> 0;
		}
		n = min(b - a >> 0, a - lo >> 0);
		swapRange(data, lo, b - n >> 0, n);
		n = min(hi - d >> 0, d - c >> 0);
		swapRange(data, c, hi - n >> 0, n);
		_tmp$4 = (lo + b >> 0) - a >> 0; _tmp$5 = hi - ((d - c >> 0)) >> 0; midlo = _tmp$4; midhi = _tmp$5;
		return [midlo, midhi];
	};
	quickSort = function(data, a, b, maxDepth) {
		var _tuple, mlo, mhi;
		while ((b - a >> 0) > 7) {
			if (maxDepth === 0) {
				heapSort(data, a, b);
				return;
			}
			maxDepth = maxDepth - 1 >> 0;
			_tuple = doPivot(data, a, b); mlo = _tuple[0]; mhi = _tuple[1];
			if ((mlo - a >> 0) < (b - mhi >> 0)) {
				quickSort(data, a, mlo, maxDepth);
				a = mhi;
			} else {
				quickSort(data, mhi, b, maxDepth);
				b = mlo;
			}
		}
		if ((b - a >> 0) > 1) {
			insertionSort(data, a, b);
		}
	};
	Sort = $pkg.Sort = function(data) {
		var n, maxDepth, i;
		n = data.Len();
		maxDepth = 0;
		i = n;
		while (i > 0) {
			maxDepth = maxDepth + 1 >> 0;
			i = i >> 1 >> 0;
		}
		maxDepth = (((maxDepth >>> 16 << 16) * 2 >> 0) + (maxDepth << 16 >>> 16) * 2) >> 0;
		quickSort(data, 0, n, maxDepth);
	};
	$pkg.init = function() {
	};
	return $pkg;
})();
$packages["unicode/utf16"] = (function() {
	var $pkg = {}, IsSurrogate, DecodeRune;
	IsSurrogate = $pkg.IsSurrogate = function(r) {
		return 55296 <= r && r < 57344;
	};
	DecodeRune = $pkg.DecodeRune = function(r1, r2) {
		if (55296 <= r1 && r1 < 56320 && 56320 <= r2 && r2 < 57344) {
			return ((((r1 - 55296 >> 0)) << 10 >> 0) | ((r2 - 56320 >> 0))) + 65536 >> 0;
		}
		return 65533;
	};
	$pkg.init = function() {
	};
	return $pkg;
})();
$packages["encoding/json"] = (function() {
	var $pkg = {}, encoding = $packages["encoding"], base64 = $packages["encoding/base64"], errors = $packages["errors"], fmt = $packages["fmt"], reflect = $packages["reflect"], runtime = $packages["runtime"], strconv = $packages["strconv"], strings = $packages["strings"], unicode = $packages["unicode"], utf16 = $packages["unicode/utf16"], utf8 = $packages["unicode/utf8"], bytes = $packages["bytes"], math = $packages["math"], sort = $packages["sort"], sync = $packages["sync"], io = $packages["io"], Unmarshaler, UnmarshalTypeError, InvalidUnmarshalError, Number, decodeState, Marshaler, encodeState, field, byName, byIndex, SyntaxError, scanner, tagOptions, Unmarshal, getu4, unquote, unquoteBytes, isValidTag, typeFields, dominantField, cachedTypeFields, checkValid, nextValue, isSpace, stateBeginValueOrEmpty, stateBeginValue, stateBeginStringOrEmpty, stateBeginString, stateEndValue, stateEndTop, stateInString, stateInStringEsc, stateInStringEscU, stateInStringEscU1, stateInStringEscU12, stateInStringEscU123, stateNeg, state1, state0, stateDot, stateDot0, stateE, stateESign, stateE0, stateT, stateTr, stateTru, stateF, stateFa, stateFal, stateFals, stateN, stateNu, stateNul, stateError, quoteChar, stateRedo, parseTag, errPhase, numberType, encodeStatePool, byteSliceType, marshalerType, textMarshalerType, fieldCache;
	Unmarshaler = $pkg.Unmarshaler = $newType(8, "Interface", "json.Unmarshaler", "Unmarshaler", "encoding/json", null);
	UnmarshalTypeError = $pkg.UnmarshalTypeError = $newType(0, "Struct", "json.UnmarshalTypeError", "UnmarshalTypeError", "encoding/json", function(Value_, Type_) {
		this.$val = this;
		this.Value = Value_ !== undefined ? Value_ : "";
		this.Type = Type_ !== undefined ? Type_ : null;
	});
	InvalidUnmarshalError = $pkg.InvalidUnmarshalError = $newType(0, "Struct", "json.InvalidUnmarshalError", "InvalidUnmarshalError", "encoding/json", function(Type_) {
		this.$val = this;
		this.Type = Type_ !== undefined ? Type_ : null;
	});
	Number = $pkg.Number = $newType(8, "String", "json.Number", "Number", "encoding/json", null);
	decodeState = $pkg.decodeState = $newType(0, "Struct", "json.decodeState", "decodeState", "encoding/json", function(data_, off_, scan_, nextscan_, savedError_, tempstr_, useNumber_) {
		this.$val = this;
		this.data = data_ !== undefined ? data_ : ($sliceType($Uint8)).nil;
		this.off = off_ !== undefined ? off_ : 0;
		this.scan = scan_ !== undefined ? scan_ : new scanner.Ptr();
		this.nextscan = nextscan_ !== undefined ? nextscan_ : new scanner.Ptr();
		this.savedError = savedError_ !== undefined ? savedError_ : null;
		this.tempstr = tempstr_ !== undefined ? tempstr_ : "";
		this.useNumber = useNumber_ !== undefined ? useNumber_ : false;
	});
	Marshaler = $pkg.Marshaler = $newType(8, "Interface", "json.Marshaler", "Marshaler", "encoding/json", null);
	encodeState = $pkg.encodeState = $newType(0, "Struct", "json.encodeState", "encodeState", "encoding/json", function(Buffer_, scratch_) {
		this.$val = this;
		this.Buffer = Buffer_ !== undefined ? Buffer_ : new bytes.Buffer.Ptr();
		this.scratch = scratch_ !== undefined ? scratch_ : $makeNativeArray("Uint8", 64, function() { return 0; });
	});
	field = $pkg.field = $newType(0, "Struct", "json.field", "field", "encoding/json", function(name_, tag_, index_, typ_, omitEmpty_, quoted_) {
		this.$val = this;
		this.name = name_ !== undefined ? name_ : "";
		this.tag = tag_ !== undefined ? tag_ : false;
		this.index = index_ !== undefined ? index_ : ($sliceType($Int)).nil;
		this.typ = typ_ !== undefined ? typ_ : null;
		this.omitEmpty = omitEmpty_ !== undefined ? omitEmpty_ : false;
		this.quoted = quoted_ !== undefined ? quoted_ : false;
	});
	byName = $pkg.byName = $newType(12, "Slice", "json.byName", "byName", "encoding/json", null);
	byIndex = $pkg.byIndex = $newType(12, "Slice", "json.byIndex", "byIndex", "encoding/json", null);
	SyntaxError = $pkg.SyntaxError = $newType(0, "Struct", "json.SyntaxError", "SyntaxError", "encoding/json", function(msg_, Offset_) {
		this.$val = this;
		this.msg = msg_ !== undefined ? msg_ : "";
		this.Offset = Offset_ !== undefined ? Offset_ : new $Int64(0, 0);
	});
	scanner = $pkg.scanner = $newType(0, "Struct", "json.scanner", "scanner", "encoding/json", function(step_, endTop_, parseState_, err_, redo_, redoCode_, redoState_, bytes_) {
		this.$val = this;
		this.step = step_ !== undefined ? step_ : $throwNilPointerError;
		this.endTop = endTop_ !== undefined ? endTop_ : false;
		this.parseState = parseState_ !== undefined ? parseState_ : ($sliceType($Int)).nil;
		this.err = err_ !== undefined ? err_ : null;
		this.redo = redo_ !== undefined ? redo_ : false;
		this.redoCode = redoCode_ !== undefined ? redoCode_ : 0;
		this.redoState = redoState_ !== undefined ? redoState_ : $throwNilPointerError;
		this.bytes = bytes_ !== undefined ? bytes_ : new $Int64(0, 0);
	});
	tagOptions = $pkg.tagOptions = $newType(8, "String", "json.tagOptions", "tagOptions", "encoding/json", null);
	Unmarshal = $pkg.Unmarshal = function(data, v) {
		var d, err;
		d = new decodeState.Ptr();
		err = checkValid(data, d.scan);
		if (!($interfaceIsEqual(err, null))) {
			return err;
		}
		d.init(data);
		return d.unmarshal(v);
	};
	UnmarshalTypeError.Ptr.prototype.Error = function() {
		var e;
		e = this;
		return "json: cannot unmarshal " + e.Value + " into Go value of type " + e.Type.String();
	};
	UnmarshalTypeError.prototype.Error = function() { return this.$val.Error(); };
	InvalidUnmarshalError.Ptr.prototype.Error = function() {
		var e;
		e = this;
		if ($interfaceIsEqual(e.Type, null)) {
			return "json: Unmarshal(nil)";
		}
		if (!((e.Type.Kind() === 22))) {
			return "json: Unmarshal(non-pointer " + e.Type.String() + ")";
		}
		return "json: Unmarshal(nil " + e.Type.String() + ")";
	};
	InvalidUnmarshalError.prototype.Error = function() { return this.$val.Error(); };
	decodeState.Ptr.prototype.unmarshal = function(v) {
		var err, d, _struct, rv, _struct$1;
		err = null;
		var $deferred = [];
		try {
			d = this;
			$deferred.push({ fun: (function() {
				var r, _tuple, ok;
				r = $recover();
				if (!($interfaceIsEqual(r, null))) {
					_tuple = (r !== null && runtime.Error.implementedBy.indexOf(r.constructor) !== -1 ? [r, true] : [null, false]); ok = _tuple[1];
					if (ok) {
						throw $panic(r);
					}
					err = (r !== null && $error.implementedBy.indexOf(r.constructor) !== -1 ? r : $typeAssertionFailed(r, $error));
				}
			}), args: [] });
			rv = (_struct = reflect.ValueOf(v), new reflect.Value.Ptr(_struct.typ, _struct.val, _struct.flag));
			if (!((rv.Kind() === 22)) || rv.IsNil()) {
				err = new InvalidUnmarshalError.Ptr(reflect.TypeOf(v));
				return err;
			}
			d.scan.reset();
			d.value((_struct$1 = rv, new reflect.Value.Ptr(_struct$1.typ, _struct$1.val, _struct$1.flag)));
			err = d.savedError;
			return err;
		} catch($err) {
			$pushErr($err);
		} finally {
			$callDeferred($deferred);
			return err;
		}
	};
	decodeState.prototype.unmarshal = function(v) { return this.$val.unmarshal(v); };
	Number.prototype.String = function() {
		var n;
		n = this.$val;
		return n;
	};
	$ptrType(Number).prototype.String = function() { return new Number(this.$get()).String(); };
	Number.prototype.Float64 = function() {
		var n;
		n = this.$val;
		return strconv.ParseFloat(n, 64);
	};
	$ptrType(Number).prototype.Float64 = function() { return new Number(this.$get()).Float64(); };
	Number.prototype.Int64 = function() {
		var n;
		n = this.$val;
		return strconv.ParseInt(n, 10, 64);
	};
	$ptrType(Number).prototype.Int64 = function() { return new Number(this.$get()).Int64(); };
	decodeState.Ptr.prototype.init = function(data) {
		var d;
		d = this;
		d.data = data;
		d.off = 0;
		d.savedError = null;
		return d;
	};
	decodeState.prototype.init = function(data) { return this.$val.init(data); };
	decodeState.Ptr.prototype.error = function(err) {
		var d;
		d = this;
		throw $panic(err);
	};
	decodeState.prototype.error = function(err) { return this.$val.error(err); };
	decodeState.Ptr.prototype.saveError = function(err) {
		var d;
		d = this;
		if ($interfaceIsEqual(d.savedError, null)) {
			d.savedError = err;
		}
	};
	decodeState.prototype.saveError = function(err) { return this.$val.saveError(err); };
	decodeState.Ptr.prototype.next = function() {
		var d, x, x$1, c, _tuple, item, rest, err;
		d = this;
		c = (x = d.data, x$1 = d.off, ((x$1 < 0 || x$1 >= x.length) ? $throwRuntimeError("index out of range") : x.array[x.offset + x$1]));
		_tuple = nextValue($subslice(d.data, d.off), d.nextscan); item = _tuple[0]; rest = _tuple[1]; err = _tuple[2];
		if (!($interfaceIsEqual(err, null))) {
			d.error(err);
		}
		d.off = d.data.length - rest.length >> 0;
		if (c === 123) {
			d.scan.step(d.scan, 125);
		} else {
			d.scan.step(d.scan, 93);
		}
		return item;
	};
	decodeState.prototype.next = function() { return this.$val.next(); };
	decodeState.Ptr.prototype.scanWhile = function(op) {
		var d, newOp, x, x$1, c;
		d = this;
		newOp = 0;
		while (true) {
			if (d.off >= d.data.length) {
				newOp = d.scan.eof();
				d.off = d.data.length + 1 >> 0;
			} else {
				c = ((x = d.data, x$1 = d.off, ((x$1 < 0 || x$1 >= x.length) ? $throwRuntimeError("index out of range") : x.array[x.offset + x$1])) >> 0);
				d.off = d.off + 1 >> 0;
				newOp = d.scan.step(d.scan, c);
			}
			if (!((newOp === op))) {
				break;
			}
		}
		return newOp;
	};
	decodeState.prototype.scanWhile = function(op) { return this.$val.scanWhile(op); };
	decodeState.Ptr.prototype.value = function(v) {
		var d, _tuple, rest, err, n, x, x$1, op, _ref, _struct, _struct$1, _struct$2;
		d = this;
		if (!v.IsValid()) {
			_tuple = nextValue($subslice(d.data, d.off), d.nextscan); rest = _tuple[1]; err = _tuple[2];
			if (!($interfaceIsEqual(err, null))) {
				d.error(err);
			}
			d.off = d.data.length - rest.length >> 0;
			if (d.scan.redo) {
				d.scan.redo = false;
				d.scan.step = stateBeginValue;
			}
			d.scan.step(d.scan, 34);
			d.scan.step(d.scan, 34);
			n = d.scan.parseState.length;
			if (n > 0 && ((x = d.scan.parseState, x$1 = n - 1 >> 0, ((x$1 < 0 || x$1 >= x.length) ? $throwRuntimeError("index out of range") : x.array[x.offset + x$1])) === 0)) {
				d.scan.step(d.scan, 58);
				d.scan.step(d.scan, 34);
				d.scan.step(d.scan, 34);
				d.scan.step(d.scan, 125);
			}
			return;
		}
		op = d.scanWhile(9);
		_ref = op;
		if (_ref === 6) {
			d.array((_struct = v, new reflect.Value.Ptr(_struct.typ, _struct.val, _struct.flag)));
		} else if (_ref === 2) {
			d.object((_struct$1 = v, new reflect.Value.Ptr(_struct$1.typ, _struct$1.val, _struct$1.flag)));
		} else if (_ref === 1) {
			d.literal((_struct$2 = v, new reflect.Value.Ptr(_struct$2.typ, _struct$2.val, _struct$2.flag)));
		} else {
			d.error(errPhase);
		}
	};
	decodeState.prototype.value = function(v) { return this.$val.value(v); };
	decodeState.Ptr.prototype.indirect = function(v, decodingNull) {
		var d, _struct, _struct$1, e, _struct$2, _struct$3, _tuple, x, u, ok, _tuple$1, x$1, u$1, ok$1, _struct$4, _struct$5;
		d = this;
		if (!((v.Kind() === 22)) && !(v.Type().Name() === "") && v.CanAddr()) {
			v = (_struct = v.Addr(), new reflect.Value.Ptr(_struct.typ, _struct.val, _struct.flag));
		}
		while (true) {
			if ((v.Kind() === 20) && !v.IsNil()) {
				e = (_struct$1 = v.Elem(), new reflect.Value.Ptr(_struct$1.typ, _struct$1.val, _struct$1.flag));
				if ((e.Kind() === 22) && !e.IsNil() && (!decodingNull || (e.Elem().Kind() === 22))) {
					v = (_struct$2 = e, new reflect.Value.Ptr(_struct$2.typ, _struct$2.val, _struct$2.flag));
					continue;
				}
			}
			if (!((v.Kind() === 22))) {
				break;
			}
			if (!((v.Elem().Kind() === 22)) && decodingNull && v.CanSet()) {
				break;
			}
			if (v.IsNil()) {
				v.Set((_struct$3 = reflect.New(v.Type().Elem()), new reflect.Value.Ptr(_struct$3.typ, _struct$3.val, _struct$3.flag)));
			}
			if (v.Type().NumMethod() > 0) {
				_tuple = (x = v.Interface(), (x !== null && Unmarshaler.implementedBy.indexOf(x.constructor) !== -1 ? [x, true] : [null, false])); u = _tuple[0]; ok = _tuple[1];
				if (ok) {
					return [u, null, new reflect.Value.Ptr(($ptrType(reflect.rtype)).nil, 0, 0)];
				}
				_tuple$1 = (x$1 = v.Interface(), (x$1 !== null && encoding.TextUnmarshaler.implementedBy.indexOf(x$1.constructor) !== -1 ? [x$1, true] : [null, false])); u$1 = _tuple$1[0]; ok$1 = _tuple$1[1];
				if (ok$1) {
					return [null, u$1, new reflect.Value.Ptr(($ptrType(reflect.rtype)).nil, 0, 0)];
				}
			}
			v = (_struct$4 = v.Elem(), new reflect.Value.Ptr(_struct$4.typ, _struct$4.val, _struct$4.flag));
		}
		return [null, null, (_struct$5 = v, new reflect.Value.Ptr(_struct$5.typ, _struct$5.val, _struct$5.flag))];
	};
	decodeState.prototype.indirect = function(v, decodingNull) { return this.$val.indirect(v, decodingNull); };
	decodeState.Ptr.prototype.array = function(v) {
		var d, _tuple, _struct, u, ut, _struct$1, pv, err, _struct$2, _ref, _struct$3, i, op, _q, newcap, _struct$4, newv, _struct$5, _struct$6, _struct$7, _struct$8, _struct$9, z, _struct$10, _struct$11;
		d = this;
		_tuple = d.indirect((_struct = v, new reflect.Value.Ptr(_struct.typ, _struct.val, _struct.flag)), false); u = _tuple[0]; ut = _tuple[1]; pv = (_struct$1 = _tuple[2], new reflect.Value.Ptr(_struct$1.typ, _struct$1.val, _struct$1.flag));
		if (!($interfaceIsEqual(u, null))) {
			d.off = d.off - 1 >> 0;
			err = u.UnmarshalJSON(d.next());
			if (!($interfaceIsEqual(err, null))) {
				d.error(err);
			}
			return;
		}
		if (!($interfaceIsEqual(ut, null))) {
			d.saveError(new UnmarshalTypeError.Ptr("array", v.Type()));
			d.off = d.off - 1 >> 0;
			d.next();
			return;
		}
		v = (_struct$2 = pv, new reflect.Value.Ptr(_struct$2.typ, _struct$2.val, _struct$2.flag));
		_ref = v.Kind();
		switch (0) { default: if (_ref === 20) {
			if (v.NumMethod() === 0) {
				v.Set((_struct$3 = reflect.ValueOf(d.arrayInterface()), new reflect.Value.Ptr(_struct$3.typ, _struct$3.val, _struct$3.flag)));
				return;
			}
			d.saveError(new UnmarshalTypeError.Ptr("array", v.Type()));
			d.off = d.off - 1 >> 0;
			d.next();
			return;
		} else if (_ref === 17) {
		} else if (_ref === 23) {
			break;
		} else {
			d.saveError(new UnmarshalTypeError.Ptr("array", v.Type()));
			d.off = d.off - 1 >> 0;
			d.next();
			return;
		} }
		i = 0;
		while (true) {
			op = d.scanWhile(9);
			if (op === 8) {
				break;
			}
			d.off = d.off - 1 >> 0;
			d.scan.undo(op);
			if (v.Kind() === 23) {
				if (i >= v.Cap()) {
					newcap = v.Cap() + (_q = v.Cap() / 2, (_q === _q && _q !== 1/0 && _q !== -1/0) ? _q >> 0 : $throwRuntimeError("integer divide by zero")) >> 0;
					if (newcap < 4) {
						newcap = 4;
					}
					newv = (_struct$4 = reflect.MakeSlice(v.Type(), v.Len(), newcap), new reflect.Value.Ptr(_struct$4.typ, _struct$4.val, _struct$4.flag));
					reflect.Copy((_struct$5 = newv, new reflect.Value.Ptr(_struct$5.typ, _struct$5.val, _struct$5.flag)), (_struct$6 = v, new reflect.Value.Ptr(_struct$6.typ, _struct$6.val, _struct$6.flag)));
					v.Set((_struct$7 = newv, new reflect.Value.Ptr(_struct$7.typ, _struct$7.val, _struct$7.flag)));
				}
				if (i >= v.Len()) {
					v.SetLen(i + 1 >> 0);
				}
			}
			if (i < v.Len()) {
				d.value((_struct$8 = v.Index(i), new reflect.Value.Ptr(_struct$8.typ, _struct$8.val, _struct$8.flag)));
			} else {
				d.value(new reflect.Value.Ptr(($ptrType(reflect.rtype)).nil, 0, 0));
			}
			i = i + 1 >> 0;
			op = d.scanWhile(9);
			if (op === 8) {
				break;
			}
			if (!((op === 7))) {
				d.error(errPhase);
			}
		}
		if (i < v.Len()) {
			if (v.Kind() === 17) {
				z = (_struct$9 = reflect.Zero(v.Type().Elem()), new reflect.Value.Ptr(_struct$9.typ, _struct$9.val, _struct$9.flag));
				while (i < v.Len()) {
					v.Index(i).Set((_struct$10 = z, new reflect.Value.Ptr(_struct$10.typ, _struct$10.val, _struct$10.flag)));
					i = i + 1 >> 0;
				}
			} else {
				v.SetLen(i);
			}
		}
		if ((i === 0) && (v.Kind() === 23)) {
			v.Set((_struct$11 = reflect.MakeSlice(v.Type(), 0, 0), new reflect.Value.Ptr(_struct$11.typ, _struct$11.val, _struct$11.flag)));
		}
	};
	decodeState.prototype.array = function(v) { return this.$val.array(v); };
	decodeState.Ptr.prototype.object = function(v) {
		var d, _tuple, _struct, u, ut, _struct$1, pv, err, _struct$2, _struct$3, _ref, t, _struct$4, mapElem, op, start, item, _tuple$1, key, ok, subv, destring, elemType, _struct$5, _struct$6, _struct$7, f, fields, _ref$1, _i, i, ff, _struct$8, _ref$2, _i$1, i$1, _struct$9, _struct$10, _struct$11, v$1, _struct$12, _struct$13, _struct$14, _struct$15, kv, _struct$16, _struct$17;
		d = this;
		_tuple = d.indirect((_struct = v, new reflect.Value.Ptr(_struct.typ, _struct.val, _struct.flag)), false); u = _tuple[0]; ut = _tuple[1]; pv = (_struct$1 = _tuple[2], new reflect.Value.Ptr(_struct$1.typ, _struct$1.val, _struct$1.flag));
		if (!($interfaceIsEqual(u, null))) {
			d.off = d.off - 1 >> 0;
			err = u.UnmarshalJSON(d.next());
			if (!($interfaceIsEqual(err, null))) {
				d.error(err);
			}
			return;
		}
		if (!($interfaceIsEqual(ut, null))) {
			d.saveError(new UnmarshalTypeError.Ptr("object", v.Type()));
			d.off = d.off - 1 >> 0;
			d.next();
			return;
		}
		v = (_struct$2 = pv, new reflect.Value.Ptr(_struct$2.typ, _struct$2.val, _struct$2.flag));
		if ((v.Kind() === 20) && (v.NumMethod() === 0)) {
			v.Set((_struct$3 = reflect.ValueOf(new ($mapType($String, $emptyInterface))(d.objectInterface())), new reflect.Value.Ptr(_struct$3.typ, _struct$3.val, _struct$3.flag)));
			return;
		}
		_ref = v.Kind();
		switch (0) { default: if (_ref === 21) {
			t = v.Type();
			if (!((t.Key().Kind() === 24))) {
				d.saveError(new UnmarshalTypeError.Ptr("object", v.Type()));
				break;
			}
			if (v.IsNil()) {
				v.Set((_struct$4 = reflect.MakeMap(t), new reflect.Value.Ptr(_struct$4.typ, _struct$4.val, _struct$4.flag)));
			}
		} else if (_ref === 25) {
		} else {
			d.saveError(new UnmarshalTypeError.Ptr("object", v.Type()));
			d.off = d.off - 1 >> 0;
			d.next();
			return;
		} }
		mapElem = new reflect.Value.Ptr();
		while (true) {
			op = d.scanWhile(9);
			if (op === 5) {
				break;
			}
			if (!((op === 1))) {
				d.error(errPhase);
			}
			start = d.off - 1 >> 0;
			op = d.scanWhile(0);
			item = $subslice(d.data, start, (d.off - 1 >> 0));
			_tuple$1 = unquote(item); key = _tuple$1[0]; ok = _tuple$1[1];
			if (!ok) {
				d.error(errPhase);
			}
			subv = new reflect.Value.Ptr();
			destring = false;
			if (v.Kind() === 21) {
				elemType = v.Type().Elem();
				if (!mapElem.IsValid()) {
					mapElem = (_struct$5 = reflect.New(elemType).Elem(), new reflect.Value.Ptr(_struct$5.typ, _struct$5.val, _struct$5.flag));
				} else {
					mapElem.Set((_struct$6 = reflect.Zero(elemType), new reflect.Value.Ptr(_struct$6.typ, _struct$6.val, _struct$6.flag)));
				}
				subv = (_struct$7 = mapElem, new reflect.Value.Ptr(_struct$7.typ, _struct$7.val, _struct$7.flag));
			} else {
				f = ($ptrType(field)).nil;
				fields = cachedTypeFields(v.Type());
				_ref$1 = fields;
				_i = 0;
				while (_i < _ref$1.length) {
					i = _i;
					ff = ((i < 0 || i >= fields.length) ? $throwRuntimeError("index out of range") : fields.array[fields.offset + i]);
					if (ff.name === key) {
						f = ff;
						break;
					}
					if (f === ($ptrType(field)).nil && strings.EqualFold(ff.name, key)) {
						f = ff;
					}
					_i++;
				}
				if (!(f === ($ptrType(field)).nil)) {
					subv = (_struct$8 = v, new reflect.Value.Ptr(_struct$8.typ, _struct$8.val, _struct$8.flag));
					destring = f.quoted;
					_ref$2 = f.index;
					_i$1 = 0;
					while (_i$1 < _ref$2.length) {
						i$1 = ((_i$1 < 0 || _i$1 >= _ref$2.length) ? $throwRuntimeError("index out of range") : _ref$2.array[_ref$2.offset + _i$1]);
						if (subv.Kind() === 22) {
							if (subv.IsNil()) {
								subv.Set((_struct$9 = reflect.New(subv.Type().Elem()), new reflect.Value.Ptr(_struct$9.typ, _struct$9.val, _struct$9.flag)));
							}
							subv = (_struct$10 = subv.Elem(), new reflect.Value.Ptr(_struct$10.typ, _struct$10.val, _struct$10.flag));
						}
						subv = (_struct$11 = subv.Field(i$1), new reflect.Value.Ptr(_struct$11.typ, _struct$11.val, _struct$11.flag));
						_i$1++;
					}
				}
			}
			if (op === 9) {
				op = d.scanWhile(9);
			}
			if (!((op === 3))) {
				d.error(errPhase);
			}
			if (destring) {
				d.value((_struct$12 = reflect.ValueOf(new ($ptrType($String))(function() { return d.tempstr; }, function(v$1) { d.tempstr = v$1;; })), new reflect.Value.Ptr(_struct$12.typ, _struct$12.val, _struct$12.flag)));
				d.literalStore(new ($sliceType($Uint8))($stringToBytes(d.tempstr)), (_struct$13 = subv, new reflect.Value.Ptr(_struct$13.typ, _struct$13.val, _struct$13.flag)), true);
			} else {
				d.value((_struct$14 = subv, new reflect.Value.Ptr(_struct$14.typ, _struct$14.val, _struct$14.flag)));
			}
			if (v.Kind() === 21) {
				kv = (_struct$15 = reflect.ValueOf(new $String(key)).Convert(v.Type().Key()), new reflect.Value.Ptr(_struct$15.typ, _struct$15.val, _struct$15.flag));
				v.SetMapIndex((_struct$16 = kv, new reflect.Value.Ptr(_struct$16.typ, _struct$16.val, _struct$16.flag)), (_struct$17 = subv, new reflect.Value.Ptr(_struct$17.typ, _struct$17.val, _struct$17.flag)));
			}
			op = d.scanWhile(9);
			if (op === 5) {
				break;
			}
			if (!((op === 4))) {
				d.error(errPhase);
			}
		}
	};
	decodeState.prototype.object = function(v) { return this.$val.object(v); };
	decodeState.Ptr.prototype.literal = function(v) {
		var d, start, op, _struct;
		d = this;
		start = d.off - 1 >> 0;
		op = d.scanWhile(0);
		d.off = d.off - 1 >> 0;
		d.scan.undo(op);
		d.literalStore($subslice(d.data, start, d.off), (_struct = v, new reflect.Value.Ptr(_struct.typ, _struct.val, _struct.flag)), false);
	};
	decodeState.prototype.literal = function(v) { return this.$val.literal(v); };
	decodeState.Ptr.prototype.convertNumber = function(s) {
		var d, _tuple, f, err;
		d = this;
		if (d.useNumber) {
			return [new Number(s), null];
		}
		_tuple = strconv.ParseFloat(s, 64); f = _tuple[0]; err = _tuple[1];
		if (!($interfaceIsEqual(err, null))) {
			return [null, new UnmarshalTypeError.Ptr("number " + s, reflect.TypeOf(new $Float64(0)))];
		}
		return [new $Float64(f), null];
	};
	decodeState.prototype.convertNumber = function(s) { return this.$val.convertNumber(s); };
	decodeState.Ptr.prototype.literalStore = function(item, v, fromQuoted) {
		var d, wantptr, _tuple, _struct, u, ut, _struct$1, pv, err, _tuple$1, s, ok, err$1, _struct$2, c, _ref, _ref$1, _struct$3, value, _ref$2, _struct$4, _tuple$2, s$1, ok$1, _ref$3, b, _tuple$3, n, err$2, _struct$5, _struct$6, s$2, _ref$4, _tuple$4, n$1, err$3, _struct$7, _tuple$5, n$2, err$4, _tuple$6, n$3, err$5, _tuple$7, n$4, err$6;
		d = this;
		if (item.length === 0) {
			d.saveError(fmt.Errorf("json: invalid use of ,string struct tag, trying to unmarshal %q into %v", new ($sliceType($emptyInterface))([item, v.Type()])));
			return;
		}
		wantptr = ((0 < 0 || 0 >= item.length) ? $throwRuntimeError("index out of range") : item.array[item.offset + 0]) === 110;
		_tuple = d.indirect((_struct = v, new reflect.Value.Ptr(_struct.typ, _struct.val, _struct.flag)), wantptr); u = _tuple[0]; ut = _tuple[1]; pv = (_struct$1 = _tuple[2], new reflect.Value.Ptr(_struct$1.typ, _struct$1.val, _struct$1.flag));
		if (!($interfaceIsEqual(u, null))) {
			err = u.UnmarshalJSON(item);
			if (!($interfaceIsEqual(err, null))) {
				d.error(err);
			}
			return;
		}
		if (!($interfaceIsEqual(ut, null))) {
			if (!((((0 < 0 || 0 >= item.length) ? $throwRuntimeError("index out of range") : item.array[item.offset + 0]) === 34))) {
				if (fromQuoted) {
					d.saveError(fmt.Errorf("json: invalid use of ,string struct tag, trying to unmarshal %q into %v", new ($sliceType($emptyInterface))([item, v.Type()])));
				} else {
					d.saveError(new UnmarshalTypeError.Ptr("string", v.Type()));
				}
			}
			_tuple$1 = unquoteBytes(item); s = _tuple$1[0]; ok = _tuple$1[1];
			if (!ok) {
				if (fromQuoted) {
					d.error(fmt.Errorf("json: invalid use of ,string struct tag, trying to unmarshal %q into %v", new ($sliceType($emptyInterface))([item, v.Type()])));
				} else {
					d.error(errPhase);
				}
			}
			err$1 = ut.UnmarshalText(s);
			if (!($interfaceIsEqual(err$1, null))) {
				d.error(err$1);
			}
			return;
		}
		v = (_struct$2 = pv, new reflect.Value.Ptr(_struct$2.typ, _struct$2.val, _struct$2.flag));
		c = ((0 < 0 || 0 >= item.length) ? $throwRuntimeError("index out of range") : item.array[item.offset + 0]);
		_ref = c;
		if (_ref === 110) {
			_ref$1 = v.Kind();
			if (_ref$1 === 20 || _ref$1 === 22 || _ref$1 === 21 || _ref$1 === 23) {
				v.Set((_struct$3 = reflect.Zero(v.Type()), new reflect.Value.Ptr(_struct$3.typ, _struct$3.val, _struct$3.flag)));
			}
		} else if (_ref === 116 || _ref === 102) {
			value = c === 116;
			_ref$2 = v.Kind();
			if (_ref$2 === 1) {
				v.SetBool(value);
			} else if (_ref$2 === 20) {
				if (v.NumMethod() === 0) {
					v.Set((_struct$4 = reflect.ValueOf(new $Bool(value)), new reflect.Value.Ptr(_struct$4.typ, _struct$4.val, _struct$4.flag)));
				} else {
					d.saveError(new UnmarshalTypeError.Ptr("bool", v.Type()));
				}
			} else {
				if (fromQuoted) {
					d.saveError(fmt.Errorf("json: invalid use of ,string struct tag, trying to unmarshal %q into %v", new ($sliceType($emptyInterface))([item, v.Type()])));
				} else {
					d.saveError(new UnmarshalTypeError.Ptr("bool", v.Type()));
				}
			}
		} else if (_ref === 34) {
			_tuple$2 = unquoteBytes(item); s$1 = _tuple$2[0]; ok$1 = _tuple$2[1];
			if (!ok$1) {
				if (fromQuoted) {
					d.error(fmt.Errorf("json: invalid use of ,string struct tag, trying to unmarshal %q into %v", new ($sliceType($emptyInterface))([item, v.Type()])));
				} else {
					d.error(errPhase);
				}
			}
			_ref$3 = v.Kind();
			switch (0) { default: if (_ref$3 === 23) {
				if (!($interfaceIsEqual(v.Type(), byteSliceType))) {
					d.saveError(new UnmarshalTypeError.Ptr("string", v.Type()));
					break;
				}
				b = ($sliceType($Uint8)).make(base64.StdEncoding.DecodedLen(s$1.length), 0, function() { return 0; });
				_tuple$3 = base64.StdEncoding.Decode(b, s$1); n = _tuple$3[0]; err$2 = _tuple$3[1];
				if (!($interfaceIsEqual(err$2, null))) {
					d.saveError(err$2);
					break;
				}
				v.Set((_struct$5 = reflect.ValueOf($subslice(b, 0, n)), new reflect.Value.Ptr(_struct$5.typ, _struct$5.val, _struct$5.flag)));
			} else if (_ref$3 === 24) {
				v.SetString($bytesToString(s$1));
			} else if (_ref$3 === 20) {
				if (v.NumMethod() === 0) {
					v.Set((_struct$6 = reflect.ValueOf(new $String($bytesToString(s$1))), new reflect.Value.Ptr(_struct$6.typ, _struct$6.val, _struct$6.flag)));
				} else {
					d.saveError(new UnmarshalTypeError.Ptr("string", v.Type()));
				}
			} else {
				d.saveError(new UnmarshalTypeError.Ptr("string", v.Type()));
			} }
		} else {
			if (!((c === 45)) && (c < 48 || c > 57)) {
				if (fromQuoted) {
					d.error(fmt.Errorf("json: invalid use of ,string struct tag, trying to unmarshal %q into %v", new ($sliceType($emptyInterface))([item, v.Type()])));
				} else {
					d.error(errPhase);
				}
			}
			s$2 = $bytesToString(item);
			_ref$4 = v.Kind();
			switch (0) { default: if (_ref$4 === 20) {
				_tuple$4 = d.convertNumber(s$2); n$1 = _tuple$4[0]; err$3 = _tuple$4[1];
				if (!($interfaceIsEqual(err$3, null))) {
					d.saveError(err$3);
					break;
				}
				if (!((v.NumMethod() === 0))) {
					d.saveError(new UnmarshalTypeError.Ptr("number", v.Type()));
					break;
				}
				v.Set((_struct$7 = reflect.ValueOf(n$1), new reflect.Value.Ptr(_struct$7.typ, _struct$7.val, _struct$7.flag)));
			} else if (_ref$4 === 2 || _ref$4 === 3 || _ref$4 === 4 || _ref$4 === 5 || _ref$4 === 6) {
				_tuple$5 = strconv.ParseInt(s$2, 10, 64); n$2 = _tuple$5[0]; err$4 = _tuple$5[1];
				if (!($interfaceIsEqual(err$4, null)) || v.OverflowInt(n$2)) {
					d.saveError(new UnmarshalTypeError.Ptr("number " + s$2, v.Type()));
					break;
				}
				v.SetInt(n$2);
			} else if (_ref$4 === 7 || _ref$4 === 8 || _ref$4 === 9 || _ref$4 === 10 || _ref$4 === 11 || _ref$4 === 12) {
				_tuple$6 = strconv.ParseUint(s$2, 10, 64); n$3 = _tuple$6[0]; err$5 = _tuple$6[1];
				if (!($interfaceIsEqual(err$5, null)) || v.OverflowUint(n$3)) {
					d.saveError(new UnmarshalTypeError.Ptr("number " + s$2, v.Type()));
					break;
				}
				v.SetUint(n$3);
			} else if (_ref$4 === 13 || _ref$4 === 14) {
				_tuple$7 = strconv.ParseFloat(s$2, v.Type().Bits()); n$4 = _tuple$7[0]; err$6 = _tuple$7[1];
				if (!($interfaceIsEqual(err$6, null)) || v.OverflowFloat(n$4)) {
					d.saveError(new UnmarshalTypeError.Ptr("number " + s$2, v.Type()));
					break;
				}
				v.SetFloat(n$4);
			} else {
				if ((v.Kind() === 24) && $interfaceIsEqual(v.Type(), numberType)) {
					v.SetString(s$2);
					break;
				}
				if (fromQuoted) {
					d.error(fmt.Errorf("json: invalid use of ,string struct tag, trying to unmarshal %q into %v", new ($sliceType($emptyInterface))([item, v.Type()])));
				} else {
					d.error(new UnmarshalTypeError.Ptr("number", v.Type()));
				}
			} }
		}
	};
	decodeState.prototype.literalStore = function(item, v, fromQuoted) { return this.$val.literalStore(item, v, fromQuoted); };
	decodeState.Ptr.prototype.valueInterface = function() {
		var d, _ref;
		d = this;
		_ref = d.scanWhile(9);
		if (_ref === 6) {
			return d.arrayInterface();
		} else if (_ref === 2) {
			return new ($mapType($String, $emptyInterface))(d.objectInterface());
		} else if (_ref === 1) {
			return d.literalInterface();
		} else {
			d.error(errPhase);
			throw $panic(new $String("unreachable"));
		}
	};
	decodeState.prototype.valueInterface = function() { return this.$val.valueInterface(); };
	decodeState.Ptr.prototype.arrayInterface = function() {
		var d, v, op;
		d = this;
		v = ($sliceType($emptyInterface)).make(0, 0, function() { return null; });
		while (true) {
			op = d.scanWhile(9);
			if (op === 8) {
				break;
			}
			d.off = d.off - 1 >> 0;
			d.scan.undo(op);
			v = $append(v, d.valueInterface());
			op = d.scanWhile(9);
			if (op === 8) {
				break;
			}
			if (!((op === 7))) {
				d.error(errPhase);
			}
		}
		return v;
	};
	decodeState.prototype.arrayInterface = function() { return this.$val.arrayInterface(); };
	decodeState.Ptr.prototype.objectInterface = function() {
		var d, m, op, start, item, _tuple, key, ok, _key;
		d = this;
		m = new $Map();
		while (true) {
			op = d.scanWhile(9);
			if (op === 5) {
				break;
			}
			if (!((op === 1))) {
				d.error(errPhase);
			}
			start = d.off - 1 >> 0;
			op = d.scanWhile(0);
			item = $subslice(d.data, start, (d.off - 1 >> 0));
			_tuple = unquote(item); key = _tuple[0]; ok = _tuple[1];
			if (!ok) {
				d.error(errPhase);
			}
			if (op === 9) {
				op = d.scanWhile(9);
			}
			if (!((op === 3))) {
				d.error(errPhase);
			}
			_key = key; (m || $throwRuntimeError("assignment to entry in nil map"))[_key] = { k: _key, v: d.valueInterface() };
			op = d.scanWhile(9);
			if (op === 5) {
				break;
			}
			if (!((op === 4))) {
				d.error(errPhase);
			}
		}
		return m;
	};
	decodeState.prototype.objectInterface = function() { return this.$val.objectInterface(); };
	decodeState.Ptr.prototype.literalInterface = function() {
		var d, start, op, item, c, _ref, _tuple, s, ok, _tuple$1, n, err;
		d = this;
		start = d.off - 1 >> 0;
		op = d.scanWhile(0);
		d.off = d.off - 1 >> 0;
		d.scan.undo(op);
		item = $subslice(d.data, start, d.off);
		c = ((0 < 0 || 0 >= item.length) ? $throwRuntimeError("index out of range") : item.array[item.offset + 0]);
		_ref = c;
		if (_ref === 110) {
			return null;
		} else if (_ref === 116 || _ref === 102) {
			return new $Bool((c === 116));
		} else if (_ref === 34) {
			_tuple = unquote(item); s = _tuple[0]; ok = _tuple[1];
			if (!ok) {
				d.error(errPhase);
			}
			return new $String(s);
		} else {
			if (!((c === 45)) && (c < 48 || c > 57)) {
				d.error(errPhase);
			}
			_tuple$1 = d.convertNumber($bytesToString(item)); n = _tuple$1[0]; err = _tuple$1[1];
			if (!($interfaceIsEqual(err, null))) {
				d.saveError(err);
			}
			return n;
		}
	};
	decodeState.prototype.literalInterface = function() { return this.$val.literalInterface(); };
	getu4 = function(s) {
		var _tuple, r, err;
		if (s.length < 6 || !((((0 < 0 || 0 >= s.length) ? $throwRuntimeError("index out of range") : s.array[s.offset + 0]) === 92)) || !((((1 < 0 || 1 >= s.length) ? $throwRuntimeError("index out of range") : s.array[s.offset + 1]) === 117))) {
			return -1;
		}
		_tuple = strconv.ParseUint($bytesToString($subslice(s, 2, 6)), 16, 64); r = _tuple[0]; err = _tuple[1];
		if (!($interfaceIsEqual(err, null))) {
			return -1;
		}
		return (r.low >> 0);
	};
	unquote = function(s) {
		var t, ok, _tuple;
		t = "";
		ok = false;
		_tuple = unquoteBytes(s); s = _tuple[0]; ok = _tuple[1];
		t = $bytesToString(s);
		return [t, ok];
	};
	unquoteBytes = function(s) {
		var t, ok, x, r, c, _tuple, rr, size, _tmp, _tmp$1, b, w, x$1, nb, c$1, _ref, rr$1, rr1, dec, _tuple$1, rr$2, size$1, _tmp$2, _tmp$3;
		t = ($sliceType($Uint8)).nil;
		ok = false;
		if (s.length < 2 || !((((0 < 0 || 0 >= s.length) ? $throwRuntimeError("index out of range") : s.array[s.offset + 0]) === 34)) || !(((x = s.length - 1 >> 0, ((x < 0 || x >= s.length) ? $throwRuntimeError("index out of range") : s.array[s.offset + x])) === 34))) {
			return [t, ok];
		}
		s = $subslice(s, 1, (s.length - 1 >> 0));
		r = 0;
		while (r < s.length) {
			c = ((r < 0 || r >= s.length) ? $throwRuntimeError("index out of range") : s.array[s.offset + r]);
			if ((c === 92) || (c === 34) || c < 32) {
				break;
			}
			if (c < 128) {
				r = r + 1 >> 0;
				continue;
			}
			_tuple = utf8.DecodeRune($subslice(s, r)); rr = _tuple[0]; size = _tuple[1];
			if ((rr === 65533) && (size === 1)) {
				break;
			}
			r = r + (size) >> 0;
		}
		if (r === s.length) {
			_tmp = s; _tmp$1 = true; t = _tmp; ok = _tmp$1;
			return [t, ok];
		}
		b = ($sliceType($Uint8)).make((s.length + 8 >> 0), 0, function() { return 0; });
		w = $copySlice(b, $subslice(s, 0, r));
		while (r < s.length) {
			if (w >= (b.length - 8 >> 0)) {
				nb = ($sliceType($Uint8)).make((x$1 = (b.length + 4 >> 0), (((x$1 >>> 16 << 16) * 2 >> 0) + (x$1 << 16 >>> 16) * 2) >> 0), 0, function() { return 0; });
				$copySlice(nb, $subslice(b, 0, w));
				b = nb;
			}
			c$1 = ((r < 0 || r >= s.length) ? $throwRuntimeError("index out of range") : s.array[s.offset + r]);
			if (c$1 === 92) {
				r = r + 1 >> 0;
				if (r >= s.length) {
					return [t, ok];
				}
				_ref = ((r < 0 || r >= s.length) ? $throwRuntimeError("index out of range") : s.array[s.offset + r]);
				switch (0) { default: if (_ref === 34 || _ref === 92 || _ref === 47 || _ref === 39) {
					(w < 0 || w >= b.length) ? $throwRuntimeError("index out of range") : b.array[b.offset + w] = ((r < 0 || r >= s.length) ? $throwRuntimeError("index out of range") : s.array[s.offset + r]);
					r = r + 1 >> 0;
					w = w + 1 >> 0;
				} else if (_ref === 98) {
					(w < 0 || w >= b.length) ? $throwRuntimeError("index out of range") : b.array[b.offset + w] = 8;
					r = r + 1 >> 0;
					w = w + 1 >> 0;
				} else if (_ref === 102) {
					(w < 0 || w >= b.length) ? $throwRuntimeError("index out of range") : b.array[b.offset + w] = 12;
					r = r + 1 >> 0;
					w = w + 1 >> 0;
				} else if (_ref === 110) {
					(w < 0 || w >= b.length) ? $throwRuntimeError("index out of range") : b.array[b.offset + w] = 10;
					r = r + 1 >> 0;
					w = w + 1 >> 0;
				} else if (_ref === 114) {
					(w < 0 || w >= b.length) ? $throwRuntimeError("index out of range") : b.array[b.offset + w] = 13;
					r = r + 1 >> 0;
					w = w + 1 >> 0;
				} else if (_ref === 116) {
					(w < 0 || w >= b.length) ? $throwRuntimeError("index out of range") : b.array[b.offset + w] = 9;
					r = r + 1 >> 0;
					w = w + 1 >> 0;
				} else if (_ref === 117) {
					r = r - 1 >> 0;
					rr$1 = getu4($subslice(s, r));
					if (rr$1 < 0) {
						return [t, ok];
					}
					r = r + 6 >> 0;
					if (utf16.IsSurrogate(rr$1)) {
						rr1 = getu4($subslice(s, r));
						dec = utf16.DecodeRune(rr$1, rr1);
						if (!((dec === 65533))) {
							r = r + 6 >> 0;
							w = w + (utf8.EncodeRune($subslice(b, w), dec)) >> 0;
							break;
						}
						rr$1 = 65533;
					}
					w = w + (utf8.EncodeRune($subslice(b, w), rr$1)) >> 0;
				} else {
					return [t, ok];
				} }
			} else if (c$1 === 34 || c$1 < 32) {
				return [t, ok];
			} else if (c$1 < 128) {
				(w < 0 || w >= b.length) ? $throwRuntimeError("index out of range") : b.array[b.offset + w] = c$1;
				r = r + 1 >> 0;
				w = w + 1 >> 0;
			} else {
				_tuple$1 = utf8.DecodeRune($subslice(s, r)); rr$2 = _tuple$1[0]; size$1 = _tuple$1[1];
				r = r + (size$1) >> 0;
				w = w + (utf8.EncodeRune($subslice(b, w), rr$2)) >> 0;
			}
		}
		_tmp$2 = $subslice(b, 0, w); _tmp$3 = true; t = _tmp$2; ok = _tmp$3;
		return [t, ok];
	};
	encodeState.Ptr.prototype.error = function(err) {
		var e;
		e = this;
		throw $panic(err);
	};
	encodeState.prototype.error = function(err) { return this.$val.error(err); };
	isValidTag = function(s) {
		var _ref, _i, _rune, c;
		if (s === "") {
			return false;
		}
		_ref = s;
		_i = 0;
		while (_i < _ref.length) {
			_rune = $decodeRune(_ref, _i);
			c = _rune[0];
			if (strings.ContainsRune("!#$%&()*+-./:<=>?@[]^_{|}~ ", c)) {
			} else {
				if (!unicode.IsLetter(c) && !unicode.IsDigit(c)) {
					return false;
				}
			}
			_i += _rune[1];
		}
		return true;
	};
	byName.prototype.Len = function() {
		var x;
		x = this;
		return x.length;
	};
	$ptrType(byName).prototype.Len = function() { return this.$get().Len(); };
	byName.prototype.Swap = function(i, j) {
		var x, _tmp, _struct, _tmp$1, _struct$1;
		x = this;
		_tmp = (_struct = ((j < 0 || j >= x.length) ? $throwRuntimeError("index out of range") : x.array[x.offset + j]), new field.Ptr(_struct.name, _struct.tag, _struct.index, _struct.typ, _struct.omitEmpty, _struct.quoted)); _tmp$1 = (_struct$1 = ((i < 0 || i >= x.length) ? $throwRuntimeError("index out of range") : x.array[x.offset + i]), new field.Ptr(_struct$1.name, _struct$1.tag, _struct$1.index, _struct$1.typ, _struct$1.omitEmpty, _struct$1.quoted)); (i < 0 || i >= x.length) ? $throwRuntimeError("index out of range") : x.array[x.offset + i] = _tmp; (j < 0 || j >= x.length) ? $throwRuntimeError("index out of range") : x.array[x.offset + j] = _tmp$1;
	};
	$ptrType(byName).prototype.Swap = function(i, j) { return this.$get().Swap(i, j); };
	byName.prototype.Less = function(i, j) {
		var x;
		x = this;
		if (!(((i < 0 || i >= x.length) ? $throwRuntimeError("index out of range") : x.array[x.offset + i]).name === ((j < 0 || j >= x.length) ? $throwRuntimeError("index out of range") : x.array[x.offset + j]).name)) {
			return ((i < 0 || i >= x.length) ? $throwRuntimeError("index out of range") : x.array[x.offset + i]).name < ((j < 0 || j >= x.length) ? $throwRuntimeError("index out of range") : x.array[x.offset + j]).name;
		}
		if (!((((i < 0 || i >= x.length) ? $throwRuntimeError("index out of range") : x.array[x.offset + i]).index.length === ((j < 0 || j >= x.length) ? $throwRuntimeError("index out of range") : x.array[x.offset + j]).index.length))) {
			return ((i < 0 || i >= x.length) ? $throwRuntimeError("index out of range") : x.array[x.offset + i]).index.length < ((j < 0 || j >= x.length) ? $throwRuntimeError("index out of range") : x.array[x.offset + j]).index.length;
		}
		if (!(((i < 0 || i >= x.length) ? $throwRuntimeError("index out of range") : x.array[x.offset + i]).tag === ((j < 0 || j >= x.length) ? $throwRuntimeError("index out of range") : x.array[x.offset + j]).tag)) {
			return ((i < 0 || i >= x.length) ? $throwRuntimeError("index out of range") : x.array[x.offset + i]).tag;
		}
		return $subslice(new byIndex(x.array), x.offset, x.offset + x.length).Less(i, j);
	};
	$ptrType(byName).prototype.Less = function(i, j) { return this.$get().Less(i, j); };
	byIndex.prototype.Len = function() {
		var x;
		x = this;
		return x.length;
	};
	$ptrType(byIndex).prototype.Len = function() { return this.$get().Len(); };
	byIndex.prototype.Swap = function(i, j) {
		var x, _tmp, _struct, _tmp$1, _struct$1;
		x = this;
		_tmp = (_struct = ((j < 0 || j >= x.length) ? $throwRuntimeError("index out of range") : x.array[x.offset + j]), new field.Ptr(_struct.name, _struct.tag, _struct.index, _struct.typ, _struct.omitEmpty, _struct.quoted)); _tmp$1 = (_struct$1 = ((i < 0 || i >= x.length) ? $throwRuntimeError("index out of range") : x.array[x.offset + i]), new field.Ptr(_struct$1.name, _struct$1.tag, _struct$1.index, _struct$1.typ, _struct$1.omitEmpty, _struct$1.quoted)); (i < 0 || i >= x.length) ? $throwRuntimeError("index out of range") : x.array[x.offset + i] = _tmp; (j < 0 || j >= x.length) ? $throwRuntimeError("index out of range") : x.array[x.offset + j] = _tmp$1;
	};
	$ptrType(byIndex).prototype.Swap = function(i, j) { return this.$get().Swap(i, j); };
	byIndex.prototype.Less = function(i, j) {
		var x, _ref, _i, xik, k, x$1, x$2;
		x = this;
		_ref = ((i < 0 || i >= x.length) ? $throwRuntimeError("index out of range") : x.array[x.offset + i]).index;
		_i = 0;
		while (_i < _ref.length) {
			xik = ((_i < 0 || _i >= _ref.length) ? $throwRuntimeError("index out of range") : _ref.array[_ref.offset + _i]);
			k = _i;
			if (k >= ((j < 0 || j >= x.length) ? $throwRuntimeError("index out of range") : x.array[x.offset + j]).index.length) {
				return false;
			}
			if (!((xik === (x$1 = ((j < 0 || j >= x.length) ? $throwRuntimeError("index out of range") : x.array[x.offset + j]).index, ((k < 0 || k >= x$1.length) ? $throwRuntimeError("index out of range") : x$1.array[x$1.offset + k]))))) {
				return xik < (x$2 = ((j < 0 || j >= x.length) ? $throwRuntimeError("index out of range") : x.array[x.offset + j]).index, ((k < 0 || k >= x$2.length) ? $throwRuntimeError("index out of range") : x$2.array[x$2.offset + k]));
			}
			_i++;
		}
		return ((i < 0 || i >= x.length) ? $throwRuntimeError("index out of range") : x.array[x.offset + i]).index.length < ((j < 0 || j >= x.length) ? $throwRuntimeError("index out of range") : x.array[x.offset + j]).index.length;
	};
	$ptrType(byIndex).prototype.Less = function(i, j) { return this.$get().Less(i, j); };
	typeFields = function(t) {
		var current, next, _map, _key, count, _map$1, _key$1, nextCount, _map$2, _key$2, visited, fields, _tmp, _tmp$1, _tmp$2, _tmp$3, _map$3, _key$3, _ref, _i, _struct, f, _entry, _key$4, i, _struct$1, sf, tag, _tuple, name, opts, index, x, ft, tagged, _entry$1, x$1, _struct$2, _lhs, _index, _entry$2, _key$5, _entry$3, out, _tmp$4, _tmp$5, advance, i$1, _struct$3, fi, name$1, x$2, _struct$4, fj, _struct$5, _tuple$1, _struct$6, dominant, ok, _struct$7;
		current = new ($sliceType(field))([]);
		next = new ($sliceType(field))([new field.Ptr("", false, ($sliceType($Int)).nil, t, false, false)]);
		count = (_map = new $Map(), _map);
		nextCount = (_map$1 = new $Map(), _map$1);
		visited = (_map$2 = new $Map(), _map$2);
		fields = ($sliceType(field)).nil;
		while (next.length > 0) {
			_tmp = next; _tmp$1 = $subslice(current, 0, 0); current = _tmp; next = _tmp$1;
			_tmp$2 = nextCount; _tmp$3 = (_map$3 = new $Map(), _map$3); count = _tmp$2; nextCount = _tmp$3;
			_ref = current;
			_i = 0;
			while (_i < _ref.length) {
				f = (_struct = ((_i < 0 || _i >= _ref.length) ? $throwRuntimeError("index out of range") : _ref.array[_ref.offset + _i]), new field.Ptr(_struct.name, _struct.tag, _struct.index, _struct.typ, _struct.omitEmpty, _struct.quoted));
				if ((_entry = visited[(f.typ || $interfaceNil).$key()], _entry !== undefined ? _entry.v : false)) {
					_i++;
					continue;
				}
				_key$4 = f.typ; (visited || $throwRuntimeError("assignment to entry in nil map"))[(_key$4 || $interfaceNil).$key()] = { k: _key$4, v: true };
				i = 0;
				while (i < f.typ.NumField()) {
					sf = (_struct$1 = f.typ.Field(i), new reflect.StructField.Ptr(_struct$1.Name, _struct$1.PkgPath, _struct$1.Type, _struct$1.Tag, _struct$1.Offset, _struct$1.Index, _struct$1.Anonymous));
					if (!(sf.PkgPath === "")) {
						i = i + 1 >> 0;
						continue;
					}
					tag = (new reflect.StructTag(sf.Tag)).Get("json");
					if (tag === "-") {
						i = i + 1 >> 0;
						continue;
					}
					_tuple = parseTag(tag); name = _tuple[0]; opts = _tuple[1];
					if (!isValidTag(name)) {
						name = "";
					}
					index = ($sliceType($Int)).make((f.index.length + 1 >> 0), 0, function() { return 0; });
					$copySlice(index, f.index);
					(x = f.index.length, (x < 0 || x >= index.length) ? $throwRuntimeError("index out of range") : index.array[index.offset + x] = i);
					ft = sf.Type;
					if (ft.Name() === "" && (ft.Kind() === 22)) {
						ft = ft.Elem();
					}
					if (!(name === "") || !sf.Anonymous || !((ft.Kind() === 25))) {
						tagged = !(name === "");
						if (name === "") {
							name = sf.Name;
						}
						fields = $append(fields, new field.Ptr(name, tagged, index, ft, (new tagOptions(opts)).Contains("omitempty"), (new tagOptions(opts)).Contains("string")));
						if ((_entry$1 = count[(f.typ || $interfaceNil).$key()], _entry$1 !== undefined ? _entry$1.v : 0) > 1) {
							fields = $append(fields, (_struct$2 = (x$1 = fields.length - 1 >> 0, ((x$1 < 0 || x$1 >= fields.length) ? $throwRuntimeError("index out of range") : fields.array[fields.offset + x$1])), new field.Ptr(_struct$2.name, _struct$2.tag, _struct$2.index, _struct$2.typ, _struct$2.omitEmpty, _struct$2.quoted)));
						}
						i = i + 1 >> 0;
						continue;
					}
					_lhs = nextCount; _index = ft; _key$5 = _index; (_lhs || $throwRuntimeError("assignment to entry in nil map"))[(_key$5 || $interfaceNil).$key()] = { k: _key$5, v: (_entry$2 = _lhs[(_index || $interfaceNil).$key()], _entry$2 !== undefined ? _entry$2.v : 0) + 1 >> 0 };
					if ((_entry$3 = nextCount[(ft || $interfaceNil).$key()], _entry$3 !== undefined ? _entry$3.v : 0) === 1) {
						next = $append(next, new field.Ptr(ft.Name(), false, index, ft, false, false));
					}
					i = i + 1 >> 0;
				}
				_i++;
			}
		}
		sort.Sort($subslice(new byName(fields.array), fields.offset, fields.offset + fields.length));
		out = $subslice(fields, 0, 0);
		_tmp$4 = 0; _tmp$5 = 0; advance = _tmp$4; i$1 = _tmp$5;
		while (i$1 < fields.length) {
			fi = (_struct$3 = ((i$1 < 0 || i$1 >= fields.length) ? $throwRuntimeError("index out of range") : fields.array[fields.offset + i$1]), new field.Ptr(_struct$3.name, _struct$3.tag, _struct$3.index, _struct$3.typ, _struct$3.omitEmpty, _struct$3.quoted));
			name$1 = fi.name;
			advance = 1;
			while ((i$1 + advance >> 0) < fields.length) {
				fj = (_struct$4 = (x$2 = i$1 + advance >> 0, ((x$2 < 0 || x$2 >= fields.length) ? $throwRuntimeError("index out of range") : fields.array[fields.offset + x$2])), new field.Ptr(_struct$4.name, _struct$4.tag, _struct$4.index, _struct$4.typ, _struct$4.omitEmpty, _struct$4.quoted));
				if (!(fj.name === name$1)) {
					break;
				}
				advance = advance + 1 >> 0;
			}
			if (advance === 1) {
				out = $append(out, (_struct$5 = fi, new field.Ptr(_struct$5.name, _struct$5.tag, _struct$5.index, _struct$5.typ, _struct$5.omitEmpty, _struct$5.quoted)));
				i$1 = i$1 + (advance) >> 0;
				continue;
			}
			_tuple$1 = dominantField($subslice(fields, i$1, (i$1 + advance >> 0))); dominant = (_struct$6 = _tuple$1[0], new field.Ptr(_struct$6.name, _struct$6.tag, _struct$6.index, _struct$6.typ, _struct$6.omitEmpty, _struct$6.quoted)); ok = _tuple$1[1];
			if (ok) {
				out = $append(out, (_struct$7 = dominant, new field.Ptr(_struct$7.name, _struct$7.tag, _struct$7.index, _struct$7.typ, _struct$7.omitEmpty, _struct$7.quoted)));
			}
			i$1 = i$1 + (advance) >> 0;
		}
		fields = out;
		sort.Sort($subslice(new byIndex(fields.array), fields.offset, fields.offset + fields.length));
		return fields;
	};
	dominantField = function(fields) {
		var length, tagged, _ref, _i, _struct, f, i, _struct$1, _struct$2;
		length = ((0 < 0 || 0 >= fields.length) ? $throwRuntimeError("index out of range") : fields.array[fields.offset + 0]).index.length;
		tagged = -1;
		_ref = fields;
		_i = 0;
		while (_i < _ref.length) {
			f = (_struct = ((_i < 0 || _i >= _ref.length) ? $throwRuntimeError("index out of range") : _ref.array[_ref.offset + _i]), new field.Ptr(_struct.name, _struct.tag, _struct.index, _struct.typ, _struct.omitEmpty, _struct.quoted));
			i = _i;
			if (f.index.length > length) {
				fields = $subslice(fields, 0, i);
				break;
			}
			if (f.tag) {
				if (tagged >= 0) {
					return [new field.Ptr("", false, ($sliceType($Int)).nil, null, false, false), false];
				}
				tagged = i;
			}
			_i++;
		}
		if (tagged >= 0) {
			return [(_struct$1 = ((tagged < 0 || tagged >= fields.length) ? $throwRuntimeError("index out of range") : fields.array[fields.offset + tagged]), new field.Ptr(_struct$1.name, _struct$1.tag, _struct$1.index, _struct$1.typ, _struct$1.omitEmpty, _struct$1.quoted)), true];
		}
		if (fields.length > 1) {
			return [new field.Ptr("", false, ($sliceType($Int)).nil, null, false, false), false];
		}
		return [(_struct$2 = ((0 < 0 || 0 >= fields.length) ? $throwRuntimeError("index out of range") : fields.array[fields.offset + 0]), new field.Ptr(_struct$2.name, _struct$2.tag, _struct$2.index, _struct$2.typ, _struct$2.omitEmpty, _struct$2.quoted)), true];
	};
	cachedTypeFields = function(t) {
		var _entry, f, _map, _key, _key$1;
		fieldCache.RWMutex.RLock();
		f = (_entry = fieldCache.m[(t || $interfaceNil).$key()], _entry !== undefined ? _entry.v : ($sliceType(field)).nil);
		fieldCache.RWMutex.RUnlock();
		if (!(f === ($sliceType(field)).nil)) {
			return f;
		}
		f = typeFields(t);
		if (f === ($sliceType(field)).nil) {
			f = new ($sliceType(field))([]);
		}
		fieldCache.RWMutex.Lock();
		if (fieldCache.m === false) {
			fieldCache.m = (_map = new $Map(), _map);
		}
		_key$1 = t; (fieldCache.m || $throwRuntimeError("assignment to entry in nil map"))[(_key$1 || $interfaceNil).$key()] = { k: _key$1, v: f };
		fieldCache.RWMutex.Unlock();
		return f;
	};
	checkValid = function(data, scan) {
		var _ref, _i, c, x;
		scan.reset();
		_ref = data;
		_i = 0;
		while (_i < _ref.length) {
			c = ((_i < 0 || _i >= _ref.length) ? $throwRuntimeError("index out of range") : _ref.array[_ref.offset + _i]);
			scan.bytes = (x = scan.bytes, new $Int64(x.high + 0, x.low + 1));
			if (scan.step(scan, (c >> 0)) === 11) {
				return scan.err;
			}
			_i++;
		}
		if (scan.eof() === 11) {
			return scan.err;
		}
		return null;
	};
	nextValue = function(data, scan) {
		var value, rest, err, _ref, _i, c, i, v, _ref$1, _tmp, _tmp$1, _tmp$2, _tmp$3, _tmp$4, _tmp$5, _tmp$6, _tmp$7, _tmp$8, _tmp$9, _tmp$10, _tmp$11;
		value = ($sliceType($Uint8)).nil;
		rest = ($sliceType($Uint8)).nil;
		err = null;
		scan.reset();
		_ref = data;
		_i = 0;
		while (_i < _ref.length) {
			c = ((_i < 0 || _i >= _ref.length) ? $throwRuntimeError("index out of range") : _ref.array[_ref.offset + _i]);
			i = _i;
			v = scan.step(scan, (c >> 0));
			if (v >= 10) {
				_ref$1 = v;
				if (_ref$1 === 11) {
					_tmp = ($sliceType($Uint8)).nil; _tmp$1 = ($sliceType($Uint8)).nil; _tmp$2 = scan.err; value = _tmp; rest = _tmp$1; err = _tmp$2;
					return [value, rest, err];
				} else if (_ref$1 === 10) {
					_tmp$3 = $subslice(data, 0, i); _tmp$4 = $subslice(data, i); _tmp$5 = null; value = _tmp$3; rest = _tmp$4; err = _tmp$5;
					return [value, rest, err];
				}
			}
			_i++;
		}
		if (scan.eof() === 11) {
			_tmp$6 = ($sliceType($Uint8)).nil; _tmp$7 = ($sliceType($Uint8)).nil; _tmp$8 = scan.err; value = _tmp$6; rest = _tmp$7; err = _tmp$8;
			return [value, rest, err];
		}
		_tmp$9 = data; _tmp$10 = ($sliceType($Uint8)).nil; _tmp$11 = null; value = _tmp$9; rest = _tmp$10; err = _tmp$11;
		return [value, rest, err];
	};
	SyntaxError.Ptr.prototype.Error = function() {
		var e;
		e = this;
		return e.msg;
	};
	SyntaxError.prototype.Error = function() { return this.$val.Error(); };
	scanner.Ptr.prototype.reset = function() {
		var s;
		s = this;
		s.step = stateBeginValue;
		s.parseState = $subslice(s.parseState, 0, 0);
		s.err = null;
		s.redo = false;
		s.endTop = false;
	};
	scanner.prototype.reset = function() { return this.$val.reset(); };
	scanner.Ptr.prototype.eof = function() {
		var s;
		s = this;
		if (!($interfaceIsEqual(s.err, null))) {
			return 11;
		}
		if (s.endTop) {
			return 10;
		}
		s.step(s, 32);
		if (s.endTop) {
			return 10;
		}
		if ($interfaceIsEqual(s.err, null)) {
			s.err = new SyntaxError.Ptr("unexpected end of JSON input", s.bytes);
		}
		return 11;
	};
	scanner.prototype.eof = function() { return this.$val.eof(); };
	scanner.Ptr.prototype.pushParseState = function(p) {
		var s;
		s = this;
		s.parseState = $append(s.parseState, p);
	};
	scanner.prototype.pushParseState = function(p) { return this.$val.pushParseState(p); };
	scanner.Ptr.prototype.popParseState = function() {
		var s, n;
		s = this;
		n = s.parseState.length - 1 >> 0;
		s.parseState = $subslice(s.parseState, 0, n);
		s.redo = false;
		if (n === 0) {
			s.step = stateEndTop;
			s.endTop = true;
		} else {
			s.step = stateEndValue;
		}
	};
	scanner.prototype.popParseState = function() { return this.$val.popParseState(); };
	isSpace = function(c) {
		return (c === 32) || (c === 9) || (c === 13) || (c === 10);
	};
	stateBeginValueOrEmpty = function(s, c) {
		if (c <= 32 && isSpace((c >> 0))) {
			return 9;
		}
		if (c === 93) {
			return stateEndValue(s, c);
		}
		return stateBeginValue(s, c);
	};
	stateBeginValue = function(s, c) {
		var _ref;
		if (c <= 32 && isSpace((c >> 0))) {
			return 9;
		}
		_ref = c;
		if (_ref === 123) {
			s.step = stateBeginStringOrEmpty;
			s.pushParseState(0);
			return 2;
		} else if (_ref === 91) {
			s.step = stateBeginValueOrEmpty;
			s.pushParseState(2);
			return 6;
		} else if (_ref === 34) {
			s.step = stateInString;
			return 1;
		} else if (_ref === 45) {
			s.step = stateNeg;
			return 1;
		} else if (_ref === 48) {
			s.step = state0;
			return 1;
		} else if (_ref === 116) {
			s.step = stateT;
			return 1;
		} else if (_ref === 102) {
			s.step = stateF;
			return 1;
		} else if (_ref === 110) {
			s.step = stateN;
			return 1;
		}
		if (49 <= c && c <= 57) {
			s.step = state1;
			return 1;
		}
		return s.error(c, "looking for beginning of value");
	};
	stateBeginStringOrEmpty = function(s, c) {
		var n, x, x$1;
		if (c <= 32 && isSpace((c >> 0))) {
			return 9;
		}
		if (c === 125) {
			n = s.parseState.length;
			(x = s.parseState, x$1 = n - 1 >> 0, (x$1 < 0 || x$1 >= x.length) ? $throwRuntimeError("index out of range") : x.array[x.offset + x$1] = 1);
			return stateEndValue(s, c);
		}
		return stateBeginString(s, c);
	};
	stateBeginString = function(s, c) {
		if (c <= 32 && isSpace((c >> 0))) {
			return 9;
		}
		if (c === 34) {
			s.step = stateInString;
			return 1;
		}
		return s.error(c, "looking for beginning of object key string");
	};
	stateEndValue = function(s, c) {
		var n, x, x$1, ps, _ref, x$2, x$3, x$4, x$5;
		n = s.parseState.length;
		if (n === 0) {
			s.step = stateEndTop;
			s.endTop = true;
			return stateEndTop(s, c);
		}
		if (c <= 32 && isSpace((c >> 0))) {
			s.step = stateEndValue;
			return 9;
		}
		ps = (x = s.parseState, x$1 = n - 1 >> 0, ((x$1 < 0 || x$1 >= x.length) ? $throwRuntimeError("index out of range") : x.array[x.offset + x$1]));
		_ref = ps;
		if (_ref === 0) {
			if (c === 58) {
				(x$2 = s.parseState, x$3 = n - 1 >> 0, (x$3 < 0 || x$3 >= x$2.length) ? $throwRuntimeError("index out of range") : x$2.array[x$2.offset + x$3] = 1);
				s.step = stateBeginValue;
				return 3;
			}
			return s.error(c, "after object key");
		} else if (_ref === 1) {
			if (c === 44) {
				(x$4 = s.parseState, x$5 = n - 1 >> 0, (x$5 < 0 || x$5 >= x$4.length) ? $throwRuntimeError("index out of range") : x$4.array[x$4.offset + x$5] = 0);
				s.step = stateBeginString;
				return 4;
			}
			if (c === 125) {
				s.popParseState();
				return 5;
			}
			return s.error(c, "after object key:value pair");
		} else if (_ref === 2) {
			if (c === 44) {
				s.step = stateBeginValue;
				return 7;
			}
			if (c === 93) {
				s.popParseState();
				return 8;
			}
			return s.error(c, "after array element");
		}
		return s.error(c, "");
	};
	stateEndTop = function(s, c) {
		if (!((c === 32)) && !((c === 9)) && !((c === 13)) && !((c === 10))) {
			s.error(c, "after top-level value");
		}
		return 10;
	};
	stateInString = function(s, c) {
		if (c === 34) {
			s.step = stateEndValue;
			return 0;
		}
		if (c === 92) {
			s.step = stateInStringEsc;
			return 0;
		}
		if (c < 32) {
			return s.error(c, "in string literal");
		}
		return 0;
	};
	stateInStringEsc = function(s, c) {
		var _ref;
		_ref = c;
		if (_ref === 98 || _ref === 102 || _ref === 110 || _ref === 114 || _ref === 116 || _ref === 92 || _ref === 47 || _ref === 34) {
			s.step = stateInString;
			return 0;
		}
		if (c === 117) {
			s.step = stateInStringEscU;
			return 0;
		}
		return s.error(c, "in string escape code");
	};
	stateInStringEscU = function(s, c) {
		if (48 <= c && c <= 57 || 97 <= c && c <= 102 || 65 <= c && c <= 70) {
			s.step = stateInStringEscU1;
			return 0;
		}
		return s.error(c, "in \\u hexadecimal character escape");
	};
	stateInStringEscU1 = function(s, c) {
		if (48 <= c && c <= 57 || 97 <= c && c <= 102 || 65 <= c && c <= 70) {
			s.step = stateInStringEscU12;
			return 0;
		}
		return s.error(c, "in \\u hexadecimal character escape");
	};
	stateInStringEscU12 = function(s, c) {
		if (48 <= c && c <= 57 || 97 <= c && c <= 102 || 65 <= c && c <= 70) {
			s.step = stateInStringEscU123;
			return 0;
		}
		return s.error(c, "in \\u hexadecimal character escape");
	};
	stateInStringEscU123 = function(s, c) {
		if (48 <= c && c <= 57 || 97 <= c && c <= 102 || 65 <= c && c <= 70) {
			s.step = stateInString;
			return 0;
		}
		return s.error(c, "in \\u hexadecimal character escape");
	};
	stateNeg = function(s, c) {
		if (c === 48) {
			s.step = state0;
			return 0;
		}
		if (49 <= c && c <= 57) {
			s.step = state1;
			return 0;
		}
		return s.error(c, "in numeric literal");
	};
	state1 = function(s, c) {
		if (48 <= c && c <= 57) {
			s.step = state1;
			return 0;
		}
		return state0(s, c);
	};
	state0 = function(s, c) {
		if (c === 46) {
			s.step = stateDot;
			return 0;
		}
		if ((c === 101) || (c === 69)) {
			s.step = stateE;
			return 0;
		}
		return stateEndValue(s, c);
	};
	stateDot = function(s, c) {
		if (48 <= c && c <= 57) {
			s.step = stateDot0;
			return 0;
		}
		return s.error(c, "after decimal point in numeric literal");
	};
	stateDot0 = function(s, c) {
		if (48 <= c && c <= 57) {
			s.step = stateDot0;
			return 0;
		}
		if ((c === 101) || (c === 69)) {
			s.step = stateE;
			return 0;
		}
		return stateEndValue(s, c);
	};
	stateE = function(s, c) {
		if (c === 43) {
			s.step = stateESign;
			return 0;
		}
		if (c === 45) {
			s.step = stateESign;
			return 0;
		}
		return stateESign(s, c);
	};
	stateESign = function(s, c) {
		if (48 <= c && c <= 57) {
			s.step = stateE0;
			return 0;
		}
		return s.error(c, "in exponent of numeric literal");
	};
	stateE0 = function(s, c) {
		if (48 <= c && c <= 57) {
			s.step = stateE0;
			return 0;
		}
		return stateEndValue(s, c);
	};
	stateT = function(s, c) {
		if (c === 114) {
			s.step = stateTr;
			return 0;
		}
		return s.error(c, "in literal true (expecting 'r')");
	};
	stateTr = function(s, c) {
		if (c === 117) {
			s.step = stateTru;
			return 0;
		}
		return s.error(c, "in literal true (expecting 'u')");
	};
	stateTru = function(s, c) {
		if (c === 101) {
			s.step = stateEndValue;
			return 0;
		}
		return s.error(c, "in literal true (expecting 'e')");
	};
	stateF = function(s, c) {
		if (c === 97) {
			s.step = stateFa;
			return 0;
		}
		return s.error(c, "in literal false (expecting 'a')");
	};
	stateFa = function(s, c) {
		if (c === 108) {
			s.step = stateFal;
			return 0;
		}
		return s.error(c, "in literal false (expecting 'l')");
	};
	stateFal = function(s, c) {
		if (c === 115) {
			s.step = stateFals;
			return 0;
		}
		return s.error(c, "in literal false (expecting 's')");
	};
	stateFals = function(s, c) {
		if (c === 101) {
			s.step = stateEndValue;
			return 0;
		}
		return s.error(c, "in literal false (expecting 'e')");
	};
	stateN = function(s, c) {
		if (c === 117) {
			s.step = stateNu;
			return 0;
		}
		return s.error(c, "in literal null (expecting 'u')");
	};
	stateNu = function(s, c) {
		if (c === 108) {
			s.step = stateNul;
			return 0;
		}
		return s.error(c, "in literal null (expecting 'l')");
	};
	stateNul = function(s, c) {
		if (c === 108) {
			s.step = stateEndValue;
			return 0;
		}
		return s.error(c, "in literal null (expecting 'l')");
	};
	stateError = function(s, c) {
		return 11;
	};
	scanner.Ptr.prototype.error = function(c, context) {
		var s;
		s = this;
		s.step = stateError;
		s.err = new SyntaxError.Ptr("invalid character " + quoteChar(c) + " " + context, s.bytes);
		return 11;
	};
	scanner.prototype.error = function(c, context) { return this.$val.error(c, context); };
	quoteChar = function(c) {
		var s;
		if (c === 39) {
			return "'\\''";
		}
		if (c === 34) {
			return "'\"'";
		}
		s = strconv.Quote($encodeRune(c));
		return "'" + s.substring(1, (s.length - 1 >> 0)) + "'";
	};
	scanner.Ptr.prototype.undo = function(scanCode) {
		var s;
		s = this;
		if (s.redo) {
			throw $panic(new $String("json: invalid use of scanner"));
		}
		s.redoCode = scanCode;
		s.redoState = s.step;
		s.step = stateRedo;
		s.redo = true;
	};
	scanner.prototype.undo = function(scanCode) { return this.$val.undo(scanCode); };
	stateRedo = function(s, c) {
		s.redo = false;
		s.step = s.redoState;
		return s.redoCode;
	};
	parseTag = function(tag) {
		var idx;
		idx = strings.Index(tag, ",");
		if (!((idx === -1))) {
			return [tag.substring(0, idx), tag.substring((idx + 1 >> 0))];
		}
		return [tag, ""];
	};
	tagOptions.prototype.Contains = function(optionName) {
		var o, s, next, i, _tmp, _tmp$1;
		o = this.$val;
		if (o.length === 0) {
			return false;
		}
		s = o;
		while (!(s === "")) {
			next = "";
			i = strings.Index(s, ",");
			if (i >= 0) {
				_tmp = s.substring(0, i); _tmp$1 = s.substring((i + 1 >> 0)); s = _tmp; next = _tmp$1;
			}
			if (s === optionName) {
				return true;
			}
			s = next;
		}
		return false;
	};
	$ptrType(tagOptions).prototype.Contains = function(optionName) { return new tagOptions(this.$get()).Contains(optionName); };
	$pkg.init = function() {
		Unmarshaler.init([["UnmarshalJSON", "UnmarshalJSON", "", [($sliceType($Uint8))], [$error], false]]);
		($ptrType(UnmarshalTypeError)).methods = [["Error", "Error", "", [], [$String], false, -1]];
		UnmarshalTypeError.init([["Value", "Value", "", $String, ""], ["Type", "Type", "", reflect.Type, ""]]);
		($ptrType(InvalidUnmarshalError)).methods = [["Error", "Error", "", [], [$String], false, -1]];
		InvalidUnmarshalError.init([["Type", "Type", "", reflect.Type, ""]]);
		Number.methods = [["Float64", "Float64", "", [], [$Float64, $error], false, -1], ["Int64", "Int64", "", [], [$Int64, $error], false, -1], ["String", "String", "", [], [$String], false, -1]];
		($ptrType(Number)).methods = [["Float64", "Float64", "", [], [$Float64, $error], false, -1], ["Int64", "Int64", "", [], [$Int64, $error], false, -1], ["String", "String", "", [], [$String], false, -1]];
		($ptrType(decodeState)).methods = [["array", "array", "encoding/json", [reflect.Value], [], false, -1], ["arrayInterface", "arrayInterface", "encoding/json", [], [($sliceType($emptyInterface))], false, -1], ["convertNumber", "convertNumber", "encoding/json", [$String], [$emptyInterface, $error], false, -1], ["error", "error", "encoding/json", [$error], [], false, -1], ["indirect", "indirect", "encoding/json", [reflect.Value, $Bool], [Unmarshaler, encoding.TextUnmarshaler, reflect.Value], false, -1], ["init", "init", "encoding/json", [($sliceType($Uint8))], [($ptrType(decodeState))], false, -1], ["literal", "literal", "encoding/json", [reflect.Value], [], false, -1], ["literalInterface", "literalInterface", "encoding/json", [], [$emptyInterface], false, -1], ["literalStore", "literalStore", "encoding/json", [($sliceType($Uint8)), reflect.Value, $Bool], [], false, -1], ["next", "next", "encoding/json", [], [($sliceType($Uint8))], false, -1], ["object", "object", "encoding/json", [reflect.Value], [], false, -1], ["objectInterface", "objectInterface", "encoding/json", [], [($mapType($String, $emptyInterface))], false, -1], ["saveError", "saveError", "encoding/json", [$error], [], false, -1], ["scanWhile", "scanWhile", "encoding/json", [$Int], [$Int], false, -1], ["unmarshal", "unmarshal", "encoding/json", [$emptyInterface], [$error], false, -1], ["value", "value", "encoding/json", [reflect.Value], [], false, -1], ["valueInterface", "valueInterface", "encoding/json", [], [$emptyInterface], false, -1]];
		decodeState.init([["data", "data", "encoding/json", ($sliceType($Uint8)), ""], ["off", "off", "encoding/json", $Int, ""], ["scan", "scan", "encoding/json", scanner, ""], ["nextscan", "nextscan", "encoding/json", scanner, ""], ["savedError", "savedError", "encoding/json", $error, ""], ["tempstr", "tempstr", "encoding/json", $String, ""], ["useNumber", "useNumber", "encoding/json", $Bool, ""]]);
		Marshaler.init([["MarshalJSON", "MarshalJSON", "", [], [($sliceType($Uint8)), $error], false]]);
		($ptrType(encodeState)).methods = [["Bytes", "Bytes", "", [], [($sliceType($Uint8))], false, 0], ["Grow", "Grow", "", [$Int], [], false, 0], ["Len", "Len", "", [], [$Int], false, 0], ["Next", "Next", "", [$Int], [($sliceType($Uint8))], false, 0], ["Read", "Read", "", [($sliceType($Uint8))], [$Int, $error], false, 0], ["ReadByte", "ReadByte", "", [], [$Uint8, $error], false, 0], ["ReadBytes", "ReadBytes", "", [$Uint8], [($sliceType($Uint8)), $error], false, 0], ["ReadFrom", "ReadFrom", "", [io.Reader], [$Int64, $error], false, 0], ["ReadRune", "ReadRune", "", [], [$Int32, $Int, $error], false, 0], ["ReadString", "ReadString", "", [$Uint8], [$String, $error], false, 0], ["Reset", "Reset", "", [], [], false, 0], ["String", "String", "", [], [$String], false, 0], ["Truncate", "Truncate", "", [$Int], [], false, 0], ["UnreadByte", "UnreadByte", "", [], [$error], false, 0], ["UnreadRune", "UnreadRune", "", [], [$error], false, 0], ["Write", "Write", "", [($sliceType($Uint8))], [$Int, $error], false, 0], ["WriteByte", "WriteByte", "", [$Uint8], [$error], false, 0], ["WriteRune", "WriteRune", "", [$Int32], [$Int, $error], false, 0], ["WriteString", "WriteString", "", [$String], [$Int, $error], false, 0], ["WriteTo", "WriteTo", "", [io.Writer], [$Int64, $error], false, 0], ["grow", "grow", "bytes", [$Int], [$Int], false, 0], ["readSlice", "readSlice", "bytes", [$Uint8], [($sliceType($Uint8)), $error], false, 0], ["error", "error", "encoding/json", [$error], [], false, -1], ["marshal", "marshal", "encoding/json", [$emptyInterface], [$error], false, -1], ["reflectValue", "reflectValue", "encoding/json", [reflect.Value], [], false, -1], ["string", "string", "encoding/json", [$String], [$Int, $error], false, -1], ["stringBytes", "stringBytes", "encoding/json", [($sliceType($Uint8))], [$Int, $error], false, -1]];
		encodeState.init([["Buffer", "", "", bytes.Buffer, ""], ["scratch", "scratch", "encoding/json", ($arrayType($Uint8, 64)), ""]]);
		field.init([["name", "name", "encoding/json", $String, ""], ["tag", "tag", "encoding/json", $Bool, ""], ["index", "index", "encoding/json", ($sliceType($Int)), ""], ["typ", "typ", "encoding/json", reflect.Type, ""], ["omitEmpty", "omitEmpty", "encoding/json", $Bool, ""], ["quoted", "quoted", "encoding/json", $Bool, ""]]);
		byName.methods = [["Len", "Len", "", [], [$Int], false, -1], ["Less", "Less", "", [$Int, $Int], [$Bool], false, -1], ["Swap", "Swap", "", [$Int, $Int], [], false, -1]];
		($ptrType(byName)).methods = [["Len", "Len", "", [], [$Int], false, -1], ["Less", "Less", "", [$Int, $Int], [$Bool], false, -1], ["Swap", "Swap", "", [$Int, $Int], [], false, -1]];
		byName.init(field);
		byIndex.methods = [["Len", "Len", "", [], [$Int], false, -1], ["Less", "Less", "", [$Int, $Int], [$Bool], false, -1], ["Swap", "Swap", "", [$Int, $Int], [], false, -1]];
		($ptrType(byIndex)).methods = [["Len", "Len", "", [], [$Int], false, -1], ["Less", "Less", "", [$Int, $Int], [$Bool], false, -1], ["Swap", "Swap", "", [$Int, $Int], [], false, -1]];
		byIndex.init(field);
		($ptrType(SyntaxError)).methods = [["Error", "Error", "", [], [$String], false, -1]];
		SyntaxError.init([["msg", "msg", "encoding/json", $String, ""], ["Offset", "Offset", "", $Int64, ""]]);
		($ptrType(scanner)).methods = [["eof", "eof", "encoding/json", [], [$Int], false, -1], ["error", "error", "encoding/json", [$Int, $String], [$Int], false, -1], ["popParseState", "popParseState", "encoding/json", [], [], false, -1], ["pushParseState", "pushParseState", "encoding/json", [$Int], [], false, -1], ["reset", "reset", "encoding/json", [], [], false, -1], ["undo", "undo", "encoding/json", [$Int], [], false, -1]];
		scanner.init([["step", "step", "encoding/json", ($funcType([($ptrType(scanner)), $Int], [$Int], false)), ""], ["endTop", "endTop", "encoding/json", $Bool, ""], ["parseState", "parseState", "encoding/json", ($sliceType($Int)), ""], ["err", "err", "encoding/json", $error, ""], ["redo", "redo", "encoding/json", $Bool, ""], ["redoCode", "redoCode", "encoding/json", $Int, ""], ["redoState", "redoState", "encoding/json", ($funcType([($ptrType(scanner)), $Int], [$Int], false)), ""], ["bytes", "bytes", "encoding/json", $Int64, ""]]);
		tagOptions.methods = [["Contains", "Contains", "", [$String], [$Bool], false, -1]];
		($ptrType(tagOptions)).methods = [["Contains", "Contains", "", [$String], [$Bool], false, -1]];
		fieldCache = new ($structType([["RWMutex", "", "", sync.RWMutex, ""], ["m", "m", "encoding/json", ($mapType(reflect.Type, ($sliceType(field)))), ""]])).Ptr(new sync.RWMutex.Ptr(), false);
		errPhase = errors.New("JSON decoder out of sync - data changing underfoot?");
		numberType = reflect.TypeOf(new Number(""));
		encodeStatePool = new ($chanType(($ptrType(encodeState)), false, false))();
		byteSliceType = reflect.TypeOf(($sliceType($Uint8)).nil);
		marshalerType = reflect.TypeOf($newDataPointer(null, ($ptrType(Marshaler)))).Elem();
		textMarshalerType = reflect.TypeOf($newDataPointer(null, ($ptrType(encoding.TextMarshaler)))).Elem();
	};
	return $pkg;
})();
$packages["github.com/codegangsta/inject"] = (function() {
	var $pkg = {}, fmt = $packages["fmt"], reflect = $packages["reflect"], Injector, TypeMapper, injector, InterfaceOf, New;
	Injector = $pkg.Injector = $newType(8, "Interface", "inject.Injector", "Injector", "github.com/codegangsta/inject", null);
	TypeMapper = $pkg.TypeMapper = $newType(8, "Interface", "inject.TypeMapper", "TypeMapper", "github.com/codegangsta/inject", null);
	injector = $pkg.injector = $newType(0, "Struct", "inject.injector", "injector", "github.com/codegangsta/inject", function(values_, parent_) {
		this.$val = this;
		this.values = values_ !== undefined ? values_ : false;
		this.parent = parent_ !== undefined ? parent_ : null;
	});
	InterfaceOf = $pkg.InterfaceOf = function(value) {
		var t;
		t = reflect.TypeOf(value);
		while (t.Kind() === 22) {
			t = t.Elem();
		}
		if (!((t.Kind() === 20))) {
			throw $panic(new $String("Called inject.InterfaceOf with a value that is not a pointer to an interface. (*MyInterface)(nil)"));
		}
		return t;
	};
	New = $pkg.New = function() {
		return new injector.Ptr(new $Map(), null);
	};
	injector.Ptr.prototype.Invoke = function(f) {
		var inj, t, in$1, i, argType, _struct, val, _struct$1;
		inj = this;
		t = reflect.TypeOf(f);
		in$1 = ($sliceType(reflect.Value)).make(t.NumIn(), 0, function() { return new reflect.Value.Ptr(); });
		i = 0;
		while (i < t.NumIn()) {
			argType = t.In(i);
			val = (_struct = inj.Get(argType), new reflect.Value.Ptr(_struct.typ, _struct.val, _struct.flag));
			if (!val.IsValid()) {
				return [($sliceType(reflect.Value)).nil, fmt.Errorf("Value not found for type %v", new ($sliceType($emptyInterface))([argType]))];
			}
			(i < 0 || i >= in$1.length) ? $throwRuntimeError("index out of range") : in$1.array[in$1.offset + i] = (_struct$1 = val, new reflect.Value.Ptr(_struct$1.typ, _struct$1.val, _struct$1.flag));
			i = i + 1 >> 0;
		}
		return [reflect.ValueOf(f).Call(in$1), null];
	};
	injector.prototype.Invoke = function(f) { return this.$val.Invoke(f); };
	injector.Ptr.prototype.Apply = function(val) {
		var inj, _struct, v, _struct$1, t, i, _struct$2, f, _struct$3, structField, ft, _struct$4, v$1, _struct$5;
		inj = this;
		v = (_struct = reflect.ValueOf(val), new reflect.Value.Ptr(_struct.typ, _struct.val, _struct.flag));
		while (v.Kind() === 22) {
			v = (_struct$1 = v.Elem(), new reflect.Value.Ptr(_struct$1.typ, _struct$1.val, _struct$1.flag));
		}
		if (!((v.Kind() === 25))) {
			return null;
		}
		t = v.Type();
		i = 0;
		while (i < v.NumField()) {
			f = (_struct$2 = v.Field(i), new reflect.Value.Ptr(_struct$2.typ, _struct$2.val, _struct$2.flag));
			structField = (_struct$3 = t.Field(i), new reflect.StructField.Ptr(_struct$3.Name, _struct$3.PkgPath, _struct$3.Type, _struct$3.Tag, _struct$3.Offset, _struct$3.Index, _struct$3.Anonymous));
			if (f.CanSet() && structField.Tag === "inject") {
				ft = f.Type();
				v$1 = (_struct$4 = inj.Get(ft), new reflect.Value.Ptr(_struct$4.typ, _struct$4.val, _struct$4.flag));
				if (!v$1.IsValid()) {
					return fmt.Errorf("Value not found for type %v", new ($sliceType($emptyInterface))([ft]));
				}
				f.Set((_struct$5 = v$1, new reflect.Value.Ptr(_struct$5.typ, _struct$5.val, _struct$5.flag)));
			}
			i = i + 1 >> 0;
		}
		return null;
	};
	injector.prototype.Apply = function(val) { return this.$val.Apply(val); };
	injector.Ptr.prototype.Map = function(val) {
		var i, _struct, _key;
		i = this;
		_key = reflect.TypeOf(val); (i.values || $throwRuntimeError("assignment to entry in nil map"))[(_key || $interfaceNil).$key()] = { k: _key, v: (_struct = reflect.ValueOf(val), new reflect.Value.Ptr(_struct.typ, _struct.val, _struct.flag)) };
		return i;
	};
	injector.prototype.Map = function(val) { return this.$val.Map(val); };
	injector.Ptr.prototype.MapTo = function(val, ifacePtr) {
		var i, _struct, _key;
		i = this;
		_key = InterfaceOf(ifacePtr); (i.values || $throwRuntimeError("assignment to entry in nil map"))[(_key || $interfaceNil).$key()] = { k: _key, v: (_struct = reflect.ValueOf(val), new reflect.Value.Ptr(_struct.typ, _struct.val, _struct.flag)) };
		return i;
	};
	injector.prototype.MapTo = function(val, ifacePtr) { return this.$val.MapTo(val, ifacePtr); };
	injector.Ptr.prototype.Get = function(t) {
		var i, _entry, _struct, val, _struct$1, _struct$2;
		i = this;
		val = (_struct = (_entry = i.values[(t || $interfaceNil).$key()], _entry !== undefined ? _entry.v : new reflect.Value.Ptr()), new reflect.Value.Ptr(_struct.typ, _struct.val, _struct.flag));
		if (!val.IsValid() && !($interfaceIsEqual(i.parent, null))) {
			val = (_struct$1 = i.parent.Get(t), new reflect.Value.Ptr(_struct$1.typ, _struct$1.val, _struct$1.flag));
		}
		return (_struct$2 = val, new reflect.Value.Ptr(_struct$2.typ, _struct$2.val, _struct$2.flag));
	};
	injector.prototype.Get = function(t) { return this.$val.Get(t); };
	injector.Ptr.prototype.SetParent = function(parent) {
		var i;
		i = this;
		i.parent = parent;
	};
	injector.prototype.SetParent = function(parent) { return this.$val.SetParent(parent); };
	$pkg.init = function() {
		Injector.init([["Apply", "Apply", "", [$emptyInterface], [$error], false], ["Get", "Get", "", [reflect.Type], [reflect.Value], false], ["Invoke", "Invoke", "", [$emptyInterface], [($sliceType(reflect.Value)), $error], false], ["Map", "Map", "", [$emptyInterface], [TypeMapper], false], ["MapTo", "MapTo", "", [$emptyInterface, $emptyInterface], [TypeMapper], false], ["SetParent", "SetParent", "", [Injector], [], false]]);
		TypeMapper.init([["Get", "Get", "", [reflect.Type], [reflect.Value], false], ["Map", "Map", "", [$emptyInterface], [TypeMapper], false], ["MapTo", "MapTo", "", [$emptyInterface, $emptyInterface], [TypeMapper], false]]);
		($ptrType(injector)).methods = [["Apply", "Apply", "", [$emptyInterface], [$error], false, -1], ["Get", "Get", "", [reflect.Type], [reflect.Value], false, -1], ["Invoke", "Invoke", "", [$emptyInterface], [($sliceType(reflect.Value)), $error], false, -1], ["Map", "Map", "", [$emptyInterface], [TypeMapper], false, -1], ["MapTo", "MapTo", "", [$emptyInterface, $emptyInterface], [TypeMapper], false, -1], ["SetParent", "SetParent", "", [Injector], [], false, -1]];
		injector.init([["values", "values", "github.com/codegangsta/inject", ($mapType(reflect.Type, reflect.Value)), ""], ["parent", "parent", "github.com/codegangsta/inject", Injector, ""]]);
	};
	return $pkg;
})();
$packages["github.com/phaikawl/options"] = (function() {
	var $pkg = {}, fmt = $packages["fmt"], reflect = $packages["reflect"], Spec, Option, OptionsProvider, NewOptions;
	Spec = $pkg.Spec = $newType(8, "Interface", "options.Spec", "Spec", "github.com/phaikawl/options", null);
	Option = $pkg.Option = $newType(8, "Interface", "options.Option", "Option", "github.com/phaikawl/options", null);
	OptionsProvider = $pkg.OptionsProvider = $newType(0, "Struct", "options.OptionsProvider", "OptionsProvider", "github.com/phaikawl/options", function(spec_, m_, set_) {
		this.$val = this;
		this.spec = spec_ !== undefined ? spec_ : null;
		this.m = m_ !== undefined ? m_ : false;
		this.set = set_ !== undefined ? set_ : false;
	});
	NewOptions = $pkg.NewOptions = function(spec) {
		var o, _struct, v, _struct$1, specType, i, _struct$2, field, _key;
		o = new OptionsProvider.Ptr(spec, new $Map(), new $Map());
		v = (_struct = reflect.ValueOf(spec), new reflect.Value.Ptr(_struct.typ, _struct.val, _struct.flag));
		if (v.CanSet()) {
			throw $panic(new $String(fmt.Sprintf("The spec passed in must be a pointer, got type %v", new ($sliceType($emptyInterface))([new $String(v.Type().Name())]))));
		}
		v = (_struct$1 = v.Elem(), new reflect.Value.Ptr(_struct$1.typ, _struct$1.val, _struct$1.flag));
		specType = v.Type();
		i = 0;
		while (i < specType.NumField()) {
			field = (_struct$2 = specType.Field(i), new reflect.StructField.Ptr(_struct$2.Name, _struct$2.PkgPath, _struct$2.Type, _struct$2.Tag, _struct$2.Offset, _struct$2.Index, _struct$2.Anonymous));
			_key = field.Type.Name(); (o.m || $throwRuntimeError("assignment to entry in nil map"))[_key] = { k: _key, v: field.Name };
			i = i + 1 >> 0;
		}
		return o;
	};
	OptionsProvider.Ptr.prototype.Options = function(opts) {
		var o, _ref, _i, opt, optType, _tuple, ok, _entry, fieldName, _struct, field, _struct$1, _key;
		o = this;
		_ref = opts;
		_i = 0;
		while (_i < _ref.length) {
			opt = ((_i < 0 || _i >= _ref.length) ? $throwRuntimeError("index out of range") : _ref.array[_ref.offset + _i]);
			optType = reflect.TypeOf(opt);
			_tuple = optType.FieldByName("Value"); ok = _tuple[1];
			if (!ok) {
				throw $panic(new $String(fmt.Sprintf("Option %v doesn't have a Value field.", new ($sliceType($emptyInterface))([new $String(optType.Name())]))));
			}
			fieldName = (_entry = o.m[optType.Name()], _entry !== undefined ? _entry.v : "");
			field = (_struct = reflect.ValueOf(o.spec).Elem().FieldByName(fieldName), new reflect.Value.Ptr(_struct.typ, _struct.val, _struct.flag));
			if (!field.CanSet() || !field.IsValid()) {
				throw $panic(new $String(fmt.Sprintf("There is no option %v.", new ($sliceType($emptyInterface))([new $String(optType.Name())]))));
			}
			field.Set((_struct$1 = reflect.ValueOf(opt), new reflect.Value.Ptr(_struct$1.typ, _struct$1.val, _struct$1.flag)));
			_key = fieldName; (o.set || $throwRuntimeError("assignment to entry in nil map"))[_key] = { k: _key, v: true };
			_i++;
		}
		return o;
	};
	OptionsProvider.prototype.Options = function(opts) { return this.$val.Options(opts); };
	OptionsProvider.Ptr.prototype.Get = function() {
		var o;
		o = this;
		return o.spec;
	};
	OptionsProvider.prototype.Get = function() { return this.$val.Get(); };
	OptionsProvider.Ptr.prototype.IsSet = function(field) {
		var o, _entry;
		o = this;
		return (_entry = o.set[field], _entry !== undefined ? _entry.v : false);
	};
	OptionsProvider.prototype.IsSet = function(field) { return this.$val.IsSet(field); };
	OptionsProvider.Ptr.prototype.ExportToMap = function() {
		var o;
		o = this;
		return o.ExportToMapWithTag("");
	};
	OptionsProvider.prototype.ExportToMap = function() { return this.$val.ExportToMap(); };
	OptionsProvider.Ptr.prototype.ExportToMapWithTag = function(tag) {
		var o, _struct, spec, specType, m, i, exportedName, taggedName, _key;
		o = this;
		spec = (_struct = reflect.ValueOf(o.spec).Elem(), new reflect.Value.Ptr(_struct.typ, _struct.val, _struct.flag));
		specType = spec.Type();
		m = new $Map();
		i = 0;
		while (i < specType.NumField()) {
			exportedName = specType.Field(i).Name;
			if (!o.IsSet(exportedName)) {
				i = i + 1 >> 0;
				continue;
			}
			if (!(tag === "")) {
				taggedName = (new reflect.StructTag(specType.Field(i).Tag)).Get(tag);
				if (!(taggedName === "")) {
					exportedName = taggedName;
				}
			}
			_key = exportedName; (m || $throwRuntimeError("assignment to entry in nil map"))[_key] = { k: _key, v: spec.Field(i).FieldByName("Value").Interface() };
			i = i + 1 >> 0;
		}
		return m;
	};
	OptionsProvider.prototype.ExportToMapWithTag = function(tag) { return this.$val.ExportToMapWithTag(tag); };
	$pkg.init = function() {
		Spec.init([]);
		Option.init([]);
		($ptrType(OptionsProvider)).methods = [["ExportToMap", "ExportToMap", "", [], [($mapType($String, $emptyInterface))], false, -1], ["ExportToMapWithTag", "ExportToMapWithTag", "", [$String], [($mapType($String, $emptyInterface))], false, -1], ["Get", "Get", "", [], [$emptyInterface], false, -1], ["IsSet", "IsSet", "", [$String], [$Bool], false, -1], ["Options", "Options", "", [($sliceType(Option))], [($ptrType(OptionsProvider))], true, -1]];
		OptionsProvider.init([["spec", "spec", "github.com/phaikawl/options", Spec, ""], ["m", "m", "github.com/phaikawl/options", ($mapType($String, $String)), ""], ["set", "set", "github.com/phaikawl/options", ($mapType($String, $Bool)), ""]]);
	};
	return $pkg;
})();
$packages["github.com/gopherjs/go-angularjs"] = (function() {
	var $pkg = {}, fmt = $packages["fmt"], reflect = $packages["reflect"], inject = $packages["github.com/codegangsta/inject"], js = $packages["github.com/gopherjs/gopherjs/js"], options = $packages["github.com/phaikawl/options"], json = $packages["encoding/json"], AngularOpts, DummyJsObj, Injector, Angular, Module, provider, Provider, Interval, Scope, headersGetter, HttpTransformFunc, ReqMethod, ReqUrl, ReqParams, ReqData, ReqHeaders, ReqTransformReqFunc, ReqTransformRespFunc, ReqTimeout, ReqSpec, ReqOpts, HttpService, HttpProvider, httpMethod, Future, RequestCallback, RootScope, QProvider, RouteOpts, RouteProvider, AngularJs, NewInjector, InitAngular, NewProvider, NewModule, HttpConfig;
	AngularOpts = $pkg.AngularOpts = $newType(0, "Struct", "angularjs.AngularOpts", "AngularOpts", "github.com/gopherjs/go-angularjs", function(OptionsProvider_) {
		this.$val = this;
		this.OptionsProvider = OptionsProvider_ !== undefined ? OptionsProvider_ : ($ptrType(options.OptionsProvider)).nil;
	});
	DummyJsObj = $pkg.DummyJsObj = $newType(0, "Struct", "angularjs.DummyJsObj", "DummyJsObj", "github.com/gopherjs/go-angularjs", function(Object_) {
		this.$val = this;
		this.Object = Object_ !== undefined ? Object_ : null;
	});
	Injector = $pkg.Injector = $newType(0, "Struct", "angularjs.Injector", "Injector", "github.com/gopherjs/go-angularjs", function(Injector_, providers_) {
		this.$val = this;
		this.Injector = Injector_ !== undefined ? Injector_ : null;
		this.providers = providers_ !== undefined ? providers_ : false;
	});
	Angular = $pkg.Angular = $newType(0, "Struct", "angularjs.Angular", "Angular", "github.com/gopherjs/go-angularjs", function(Inj_) {
		this.$val = this;
		this.Inj = Inj_ !== undefined ? Inj_ : ($ptrType(Injector)).nil;
	});
	Module = $pkg.Module = $newType(0, "Struct", "angularjs.Module", "Module", "github.com/gopherjs/go-angularjs", function(Object_) {
		this.$val = this;
		this.Object = Object_ !== undefined ? Object_ : null;
	});
	provider = $pkg.provider = $newType(8, "Interface", "angularjs.provider", "provider", "github.com/gopherjs/go-angularjs", null);
	Provider = $pkg.Provider = $newType(0, "Struct", "angularjs.Provider", "Provider", "github.com/gopherjs/go-angularjs", function(Object_, angularName_) {
		this.$val = this;
		this.Object = Object_ !== undefined ? Object_ : null;
		this.angularName = angularName_ !== undefined ? angularName_ : "";
	});
	Interval = $pkg.Interval = $newType(0, "Struct", "angularjs.Interval", "Interval", "github.com/gopherjs/go-angularjs", function(Provider_) {
		this.$val = this;
		this.Provider = Provider_ !== undefined ? Provider_ : ($ptrType(Provider)).nil;
	});
	Scope = $pkg.Scope = $newType(0, "Struct", "angularjs.Scope", "Scope", "github.com/gopherjs/go-angularjs", function(Provider_) {
		this.$val = this;
		this.Provider = Provider_ !== undefined ? Provider_ : ($ptrType(Provider)).nil;
	});
	headersGetter = $pkg.headersGetter = $newType(4, "Func", "angularjs.headersGetter", "headersGetter", "github.com/gopherjs/go-angularjs", null);
	HttpTransformFunc = $pkg.HttpTransformFunc = $newType(4, "Func", "angularjs.HttpTransformFunc", "HttpTransformFunc", "github.com/gopherjs/go-angularjs", null);
	ReqMethod = $pkg.ReqMethod = $newType(0, "Struct", "angularjs.ReqMethod", "ReqMethod", "github.com/gopherjs/go-angularjs", function(Value_) {
		this.$val = this;
		this.Value = Value_ !== undefined ? Value_ : "";
	});
	ReqUrl = $pkg.ReqUrl = $newType(0, "Struct", "angularjs.ReqUrl", "ReqUrl", "github.com/gopherjs/go-angularjs", function(Value_) {
		this.$val = this;
		this.Value = Value_ !== undefined ? Value_ : "";
	});
	ReqParams = $pkg.ReqParams = $newType(0, "Struct", "angularjs.ReqParams", "ReqParams", "github.com/gopherjs/go-angularjs", function(Value_) {
		this.$val = this;
		this.Value = Value_ !== undefined ? Value_ : false;
	});
	ReqData = $pkg.ReqData = $newType(0, "Struct", "angularjs.ReqData", "ReqData", "github.com/gopherjs/go-angularjs", function(Value_) {
		this.$val = this;
		this.Value = Value_ !== undefined ? Value_ : "";
	});
	ReqHeaders = $pkg.ReqHeaders = $newType(0, "Struct", "angularjs.ReqHeaders", "ReqHeaders", "github.com/gopherjs/go-angularjs", function(Value_) {
		this.$val = this;
		this.Value = Value_ !== undefined ? Value_ : false;
	});
	ReqTransformReqFunc = $pkg.ReqTransformReqFunc = $newType(0, "Struct", "angularjs.ReqTransformReqFunc", "ReqTransformReqFunc", "github.com/gopherjs/go-angularjs", function(Value_) {
		this.$val = this;
		this.Value = Value_ !== undefined ? Value_ : $throwNilPointerError;
	});
	ReqTransformRespFunc = $pkg.ReqTransformRespFunc = $newType(0, "Struct", "angularjs.ReqTransformRespFunc", "ReqTransformRespFunc", "github.com/gopherjs/go-angularjs", function(Value_) {
		this.$val = this;
		this.Value = Value_ !== undefined ? Value_ : $throwNilPointerError;
	});
	ReqTimeout = $pkg.ReqTimeout = $newType(0, "Struct", "angularjs.ReqTimeout", "ReqTimeout", "github.com/gopherjs/go-angularjs", function(Value_) {
		this.$val = this;
		this.Value = Value_ !== undefined ? Value_ : 0;
	});
	ReqSpec = $pkg.ReqSpec = $newType(0, "Struct", "angularjs.ReqSpec", "ReqSpec", "github.com/gopherjs/go-angularjs", function(Method_, Url_, Params_, Data_, Headers_, TransformReq_, TransformResp_, Timeout_) {
		this.$val = this;
		this.Method = Method_ !== undefined ? Method_ : new ReqMethod.Ptr();
		this.Url = Url_ !== undefined ? Url_ : new ReqUrl.Ptr();
		this.Params = Params_ !== undefined ? Params_ : new ReqParams.Ptr();
		this.Data = Data_ !== undefined ? Data_ : new ReqData.Ptr();
		this.Headers = Headers_ !== undefined ? Headers_ : new ReqHeaders.Ptr();
		this.TransformReq = TransformReq_ !== undefined ? TransformReq_ : new ReqTransformReqFunc.Ptr();
		this.TransformResp = TransformResp_ !== undefined ? TransformResp_ : new ReqTransformRespFunc.Ptr();
		this.Timeout = Timeout_ !== undefined ? Timeout_ : new ReqTimeout.Ptr();
	});
	ReqOpts = $pkg.ReqOpts = $newType(0, "Struct", "angularjs.ReqOpts", "ReqOpts", "github.com/gopherjs/go-angularjs", function(AngularOpts_) {
		this.$val = this;
		this.AngularOpts = AngularOpts_ !== undefined ? AngularOpts_ : new AngularOpts.Ptr();
	});
	HttpService = $pkg.HttpService = $newType(0, "Struct", "angularjs.HttpService", "HttpService", "github.com/gopherjs/go-angularjs", function(Provider_) {
		this.$val = this;
		this.Provider = Provider_ !== undefined ? Provider_ : ($ptrType(Provider)).nil;
	});
	HttpProvider = $pkg.HttpProvider = $newType(0, "Struct", "angularjs.HttpProvider", "HttpProvider", "github.com/gopherjs/go-angularjs", function(Provider_) {
		this.$val = this;
		this.Provider = Provider_ !== undefined ? Provider_ : ($ptrType(Provider)).nil;
	});
	httpMethod = $pkg.httpMethod = $newType(8, "String", "angularjs.httpMethod", "httpMethod", "github.com/gopherjs/go-angularjs", null);
	Future = $pkg.Future = $newType(0, "Struct", "angularjs.Future", "Future", "github.com/gopherjs/go-angularjs", function(Object_) {
		this.$val = this;
		this.Object = Object_ !== undefined ? Object_ : null;
	});
	RequestCallback = $pkg.RequestCallback = $newType(8, "Interface", "angularjs.RequestCallback", "RequestCallback", "github.com/gopherjs/go-angularjs", null);
	RootScope = $pkg.RootScope = $newType(0, "Struct", "angularjs.RootScope", "RootScope", "github.com/gopherjs/go-angularjs", function(Provider_) {
		this.$val = this;
		this.Provider = Provider_ !== undefined ? Provider_ : ($ptrType(Provider)).nil;
	});
	QProvider = $pkg.QProvider = $newType(0, "Struct", "angularjs.QProvider", "QProvider", "github.com/gopherjs/go-angularjs", function(Provider_) {
		this.$val = this;
		this.Provider = Provider_ !== undefined ? Provider_ : ($ptrType(Provider)).nil;
	});
	RouteOpts = $pkg.RouteOpts = $newType(0, "Struct", "angularjs.RouteOpts", "RouteOpts", "github.com/gopherjs/go-angularjs", function(AngularOpts_) {
		this.$val = this;
		this.AngularOpts = AngularOpts_ !== undefined ? AngularOpts_ : new AngularOpts.Ptr();
	});
	RouteProvider = $pkg.RouteProvider = $newType(0, "Struct", "angularjs.RouteProvider", "RouteProvider", "github.com/gopherjs/go-angularjs", function(Provider_) {
		this.$val = this;
		this.Provider = Provider_ !== undefined ? Provider_ : ($ptrType(Provider)).nil;
	});
	AngularOpts.Ptr.prototype.toJs = function() {
		var o;
		o = this;
		return o.OptionsProvider.ExportToMapWithTag("js");
	};
	AngularOpts.prototype.toJs = function() { return this.$val.toJs(); };
	DummyJsObj.Ptr.prototype.Get = function(name) {
		var _struct, obj;
		obj = (_struct = this, new DummyJsObj.Ptr(_struct.Object));
		return new obj.constructor.Struct(obj);
	};
	DummyJsObj.prototype.Get = function(name) { return this.$val.Get(name); };
	DummyJsObj.Ptr.prototype.Call = function(name, params) {
		var _struct, obj;
		obj = (_struct = this, new DummyJsObj.Ptr(_struct.Object));
		return new obj.constructor.Struct(obj);
	};
	DummyJsObj.prototype.Call = function(name, params) { return this.$val.Call(name, params); };
	AngularJs = $pkg.AngularJs = function() {
		var obj;
		obj = null;
		var $deferred = [];
		try {
			$deferred.push({ fun: (function() {
				var r, x;
				r = $recover();
				if (!($interfaceIsEqual(r, null))) {
					obj = (x = new DummyJsObj.Ptr(null), new x.constructor.Struct(x));
				}
			}), args: [] });
			obj = $global.angular;
			return obj;
		} catch($err) {
			$pushErr($err);
		} finally {
			$callDeferred($deferred);
			return obj;
		}
	};
	NewInjector = $pkg.NewInjector = function() {
		var inj;
		inj = new Injector.Ptr(inject.New(), $pkg.AngularProvidersList);
		return inj;
	};
	Injector.Ptr.prototype.requestedProviders = function(fn) {
		var providers, inj, t, i, argType, ok, _tuple, _entry;
		providers = ($sliceType(provider)).nil;
		inj = this;
		t = reflect.TypeOf(fn);
		providers = ($sliceType(provider)).make(t.NumIn(), 0, function() { return null; });
		i = 0;
		while (i < t.NumIn()) {
			argType = t.In(i).Elem();
			ok = false;
			_tuple = (_entry = inj.providers[(argType || $interfaceNil).$key()], _entry !== undefined ? [_entry.v, true] : [null, false]); (i < 0 || i >= providers.length) ? $throwRuntimeError("index out of range") : providers.array[providers.offset + i] = _tuple[0]; ok = _tuple[1];
			if (!ok) {
				throw $panic(new $String(fmt.Sprintf("Invalid provider type %v.", new ($sliceType($emptyInterface))([new $String(argType.Name())]))));
			}
			i = i + 1 >> 0;
		}
		return providers;
	};
	Injector.prototype.requestedProviders = function(fn) { return this.$val.requestedProviders(fn); };
	Injector.Ptr.prototype._angularDeps = function(fn, transformFn) {
		var inj, rp, deps, _ref, _i, i;
		inj = this;
		rp = inj.requestedProviders(fn);
		deps = ($sliceType($emptyInterface)).make(rp.length, 0, function() { return null; });
		_ref = rp;
		_i = 0;
		while (_i < _ref.length) {
			i = _i;
			(i < 0 || i >= deps.length) ? $throwRuntimeError("index out of range") : deps.array[deps.offset + i] = new $String(((i < 0 || i >= rp.length) ? $throwRuntimeError("index out of range") : rp.array[rp.offset + i]).AngularName());
			_i++;
		}
		deps = $append(deps, new ($funcType([($sliceType(js.Object))], [$emptyInterface], true))((function(providers) {
			var in$1, _ref$1, _i$1, p, i$1, _struct, x, _struct$1;
			in$1 = ($sliceType(reflect.Value)).make(rp.length, 0, function() { return new reflect.Value.Ptr(); });
			_ref$1 = rp;
			_i$1 = 0;
			while (_i$1 < _ref$1.length) {
				p = ((_i$1 < 0 || _i$1 >= _ref$1.length) ? $throwRuntimeError("index out of range") : _ref$1.array[_ref$1.offset + _i$1]);
				i$1 = _i$1;
				p.SetJs(((i$1 < 0 || i$1 >= providers.length) ? $throwRuntimeError("index out of range") : providers.array[providers.offset + i$1]));
				(i$1 < 0 || i$1 >= in$1.length) ? $throwRuntimeError("index out of range") : in$1.array[in$1.offset + i$1] = (_struct = reflect.ValueOf(p), new reflect.Value.Ptr(_struct.typ, _struct.val, _struct.flag));
				_i$1++;
			}
			if (reflect.TypeOf(fn).NumOut() > 0 && !(transformFn === $throwNilPointerError)) {
				return transformFn((_struct$1 = (x = reflect.ValueOf(fn).Call(in$1), ((0 < 0 || 0 >= x.length) ? $throwRuntimeError("index out of range") : x.array[x.offset + 0])), new reflect.Value.Ptr(_struct$1.typ, _struct$1.val, _struct$1.flag))).Interface();
			}
			reflect.ValueOf(fn).Call(in$1);
			return null;
		})));
		return deps;
	};
	Injector.prototype._angularDeps = function(fn, transformFn) { return this.$val._angularDeps(fn, transformFn); };
	Injector.Ptr.prototype.angularDeps = function(fn) {
		var inj;
		inj = this;
		return inj._angularDeps(fn, (function(v) {
			var _struct;
			return (_struct = v, new reflect.Value.Ptr(_struct.typ, _struct.val, _struct.flag));
		}));
	};
	Injector.prototype.angularDeps = function(fn) { return this.$val.angularDeps(fn); };
	InitAngular = $pkg.InitAngular = function() {
		var ng;
		ng = new Angular.Ptr(NewInjector());
		return ng;
	};
	NewProvider = $pkg.NewProvider = function(name) {
		var p;
		p = new Provider.Ptr(null, "");
		p.angularName = name;
		return p;
	};
	Provider.Ptr.prototype.SetJs = function(obj) {
		var p;
		p = this;
		p.Object = obj;
	};
	Provider.prototype.SetJs = function(obj) { return this.$val.SetJs(obj); };
	Provider.Ptr.prototype.AngularName = function() {
		var p;
		p = this;
		return p.angularName;
	};
	Provider.prototype.AngularName = function() { return this.$val.AngularName(); };
	Module.Ptr.prototype.Config = function(fn) {
		var m;
		m = this;
		m.Object.config($externalize($pkg.Ng.Inj.angularDeps(fn), ($sliceType($emptyInterface))));
	};
	Module.prototype.Config = function(fn) { return this.$val.Config(fn); };
	Module.Ptr.prototype.Factory = function(name, fn) {
		var m;
		m = this;
		m.Object.factory($externalize(name, $String), $externalize($pkg.Ng.Inj.angularDeps(fn), ($sliceType($emptyInterface))));
	};
	Module.prototype.Factory = function(name, fn) { return this.$val.Factory(name, fn); };
	Module.Ptr.prototype.NewController = function(name, constructor) {
		var m;
		m = this;
		m.Object.controller($externalize(name, $String), $externalize($pkg.Ng.Inj.angularDeps(constructor), ($sliceType($emptyInterface))));
	};
	Module.prototype.NewController = function(name, constructor) { return this.$val.NewController(name, constructor); };
	Scope.Ptr.prototype.Apply = function(f) {
		var s;
		s = this;
		s.Provider.Object.$apply($externalize(f, ($funcType([], [], false))));
	};
	Scope.prototype.Apply = function(f) { return this.$val.Apply(f); };
	Scope.Ptr.prototype.EvalAsync = function(f) {
		var s;
		s = this;
		s.Provider.Object.$evalAsync($externalize(f, ($funcType([], [], false))));
	};
	Scope.prototype.EvalAsync = function(f) { return this.$val.EvalAsync(f); };
	NewModule = $pkg.NewModule = function(name, requires) {
		return new Module.Ptr(AngularJs().module($externalize(name, $String), $externalize(requires, ($sliceType($String)))));
	};
	ReqOpts.Ptr.prototype.Spec = function() {
		var r, x;
		r = this;
		return (x = r.AngularOpts.OptionsProvider.Get(), (x !== null && x.constructor === ($ptrType(ReqSpec)) ? x.$val : $typeAssertionFailed(x, ($ptrType(ReqSpec)))));
	};
	ReqOpts.prototype.Spec = function() { return this.$val.Spec(); };
	HttpConfig = $pkg.HttpConfig = function(opts) {
		return new ReqOpts.Ptr(new AngularOpts.Ptr(options.NewOptions(new ReqSpec.Ptr(new ReqMethod.Ptr(), new ReqUrl.Ptr(), new ReqParams.Ptr(), new ReqData.Ptr(), new ReqHeaders.Ptr(), new ReqTransformReqFunc.Ptr(), new ReqTransformRespFunc.Ptr(), new ReqTimeout.Ptr())).Options(opts)));
	};
	Future.Ptr.prototype.call = function(state, callback) {
		var ft;
		ft = this;
		ft.Object[$externalize(state, $String)]($externalize((function(data, status, headers, config) {
			var cbt, in$1, dparam, d, _ref, _tuple, ok, _struct, sdata, ok$1, _tuple$1, _struct$1, err, _struct$2, _struct$3;
			cbt = reflect.TypeOf(callback);
			in$1 = ($sliceType(reflect.Value)).make(cbt.NumIn(), 0, function() { return new reflect.Value.Ptr(); });
			dparam = cbt.In(0);
			d = new reflect.Value.Ptr();
			_ref = dparam.Name();
			if (_ref === "string") {
				_tuple = (data !== null && data.constructor === $String ? [data.$val, true] : ["", false]); ok = _tuple[1];
				if (!ok) {
					throw $panic(new $String("Type mismatch."));
				}
				d = (_struct = reflect.ValueOf(data), new reflect.Value.Ptr(_struct.typ, _struct.val, _struct.flag));
			} else {
				sdata = "";
				ok$1 = false;
				_tuple$1 = (data !== null && data.constructor === $String ? [data.$val, true] : ["", false]); sdata = _tuple$1[0]; ok$1 = _tuple$1[1];
				if (!ok$1) {
					throw $panic(new $String("Something is wrong."));
				}
				d = (_struct$1 = reflect.New(dparam), new reflect.Value.Ptr(_struct$1.typ, _struct$1.val, _struct$1.flag));
				err = json.Unmarshal(new ($sliceType($Uint8))($stringToBytes(sdata)), d.Interface());
				if (!($interfaceIsEqual(err, null))) {
					throw $panic(new $String(fmt.Sprintf("Response \"%v\" cannot be parsed to type %s. Error %v", new ($sliceType($emptyInterface))([new $String(sdata), dparam, new $String(err.Error())]))));
				}
			}
			(0 < 0 || 0 >= in$1.length) ? $throwRuntimeError("index out of range") : in$1.array[in$1.offset + 0] = (_struct$2 = d.Elem(), new reflect.Value.Ptr(_struct$2.typ, _struct$2.val, _struct$2.flag));
			(1 < 0 || 1 >= in$1.length) ? $throwRuntimeError("index out of range") : in$1.array[in$1.offset + 1] = (_struct$3 = reflect.ValueOf(new $Int(status)), new reflect.Value.Ptr(_struct$3.typ, _struct$3.val, _struct$3.flag));
			reflect.ValueOf(callback).Call(in$1);
		}), ($funcType([$emptyInterface, $Int, js.Object, js.Object], [], false))));
		return ft;
	};
	Future.prototype.call = function(state, callback) { return this.$val.call(state, callback); };
	Future.Ptr.prototype.Success = function(callback) {
		var ft;
		ft = this;
		return ft.call("success", callback);
	};
	Future.prototype.Success = function(callback) { return this.$val.Success(callback); };
	Future.Ptr.prototype.Error = function(callback) {
		var ft;
		ft = this;
		return ft.call("error", callback);
	};
	Future.prototype.Error = function(callback) { return this.$val.Error(callback); };
	HttpService.Ptr.prototype.SimpleRequest = function(method, url) {
		var s, x, x$1;
		s = this;
		return s.Request(HttpConfig(new ($sliceType(options.Option))([(x = new ReqMethod.Ptr(method), new x.constructor.Struct(x)), (x$1 = new ReqUrl.Ptr(url), new x$1.constructor.Struct(x$1))])));
	};
	HttpService.prototype.SimpleRequest = function(method, url) { return this.$val.SimpleRequest(method, url); };
	HttpService.Ptr.prototype.Request = function(spec) {
		var s, x, future;
		s = this;
		if (!spec.AngularOpts.OptionsProvider.IsSet("TransformReq")) {
			spec.AngularOpts.OptionsProvider.Options(new ($sliceType(options.Option))([(x = new ReqTransformRespFunc.Ptr((function(data, hg) {
				return data;
			})), new x.constructor.Struct(x))]));
		}
		future = s.Provider.Object($externalize(spec.AngularOpts.toJs(), ($mapType($String, $emptyInterface))));
		return new Future.Ptr(future);
	};
	HttpService.prototype.Request = function(spec) { return this.$val.Request(spec); };
	HttpService.Ptr.prototype.Get = function(url) {
		var s;
		s = this;
		return s.SimpleRequest("GET", url);
	};
	HttpService.prototype.Get = function(url) { return this.$val.Get(url); };
	QProvider.Ptr.prototype.Defer = function() {
		var q;
		q = this;
		return q.Provider.Object.defer();
	};
	QProvider.prototype.Defer = function() { return this.$val.Defer(); };
	QProvider.Ptr.prototype.When = function(value) {
		var q;
		q = this;
		return q.Provider.Object.when(value);
	};
	QProvider.prototype.When = function(value) { return this.$val.When(value); };
	QProvider.Ptr.prototype.Reject = function(reason) {
		var q;
		q = this;
		return q.Provider.Object.reject($externalize(reason, $String));
	};
	QProvider.prototype.Reject = function(reason) { return this.$val.Reject(reason); };
	QProvider.Ptr.prototype.All = function(promises) {
		var q;
		q = this;
		return q.Provider.Object.all($externalize(promises, ($sliceType(js.Object))));
	};
	QProvider.prototype.All = function(promises) { return this.$val.All(promises); };
	QProvider.Ptr.prototype.NowOrLater = function(obj) {
		var q;
		q = this;
		if ((obj === null) || (obj === undefined)) {
			return q.When(obj);
		}
		return obj;
	};
	QProvider.prototype.NowOrLater = function(obj) { return this.$val.NowOrLater(obj); };
	RouteProvider.Ptr.prototype.When = function(path, route) {
		var r;
		r = this;
		r.Provider.Object.when($externalize(path, $String), $externalize(route.AngularOpts.toJs(), ($mapType($String, $emptyInterface))));
		return r;
	};
	RouteProvider.prototype.When = function(path, route) { return this.$val.When(path, route); };
	RouteProvider.Ptr.prototype.Otherwise = function(route) {
		var r;
		r = this;
		r.Provider.Object.otherwise($externalize(route.AngularOpts.toJs(), ($mapType($String, $emptyInterface))));
	};
	RouteProvider.prototype.Otherwise = function(route) { return this.$val.Otherwise(route); };
	$pkg.init = function() {
		AngularOpts.methods = [["ExportToMap", "ExportToMap", "", [], [($mapType($String, $emptyInterface))], false, 0], ["ExportToMapWithTag", "ExportToMapWithTag", "", [$String], [($mapType($String, $emptyInterface))], false, 0], ["Get", "Get", "", [], [$emptyInterface], false, 0], ["IsSet", "IsSet", "", [$String], [$Bool], false, 0], ["Options", "Options", "", [($sliceType(options.Option))], [($ptrType(options.OptionsProvider))], true, 0]];
		($ptrType(AngularOpts)).methods = [["ExportToMap", "ExportToMap", "", [], [($mapType($String, $emptyInterface))], false, 0], ["ExportToMapWithTag", "ExportToMapWithTag", "", [$String], [($mapType($String, $emptyInterface))], false, 0], ["Get", "Get", "", [], [$emptyInterface], false, 0], ["IsSet", "IsSet", "", [$String], [$Bool], false, 0], ["Options", "Options", "", [($sliceType(options.Option))], [($ptrType(options.OptionsProvider))], true, 0], ["toJs", "toJs", "github.com/gopherjs/go-angularjs", [], [($mapType($String, $emptyInterface))], false, -1]];
		AngularOpts.init([["OptionsProvider", "", "", ($ptrType(options.OptionsProvider)), ""]]);
		DummyJsObj.methods = [["Bool", "Bool", "", [], [$Bool], false, 0], ["Call", "Call", "", [$String, ($sliceType($emptyInterface))], [js.Object], true, -1], ["Delete", "Delete", "", [$String], [], false, 0], ["Float", "Float", "", [], [$Float64], false, 0], ["Get", "Get", "", [$String], [js.Object], false, -1], ["Index", "Index", "", [$Int], [js.Object], false, 0], ["Int", "Int", "", [], [$Int], false, 0], ["Int64", "Int64", "", [], [$Int64], false, 0], ["Interface", "Interface", "", [], [$emptyInterface], false, 0], ["Invoke", "Invoke", "", [($sliceType($emptyInterface))], [js.Object], true, 0], ["IsNull", "IsNull", "", [], [$Bool], false, 0], ["IsUndefined", "IsUndefined", "", [], [$Bool], false, 0], ["Length", "Length", "", [], [$Int], false, 0], ["New", "New", "", [($sliceType($emptyInterface))], [js.Object], true, 0], ["Set", "Set", "", [$String, $emptyInterface], [], false, 0], ["SetIndex", "SetIndex", "", [$Int, $emptyInterface], [], false, 0], ["Str", "Str", "", [], [$String], false, 0], ["Uint64", "Uint64", "", [], [$Uint64], false, 0], ["Unsafe", "Unsafe", "", [], [$Uintptr], false, 0]];
		($ptrType(DummyJsObj)).methods = [["Bool", "Bool", "", [], [$Bool], false, 0], ["Call", "Call", "", [$String, ($sliceType($emptyInterface))], [js.Object], true, -1], ["Delete", "Delete", "", [$String], [], false, 0], ["Float", "Float", "", [], [$Float64], false, 0], ["Get", "Get", "", [$String], [js.Object], false, -1], ["Index", "Index", "", [$Int], [js.Object], false, 0], ["Int", "Int", "", [], [$Int], false, 0], ["Int64", "Int64", "", [], [$Int64], false, 0], ["Interface", "Interface", "", [], [$emptyInterface], false, 0], ["Invoke", "Invoke", "", [($sliceType($emptyInterface))], [js.Object], true, 0], ["IsNull", "IsNull", "", [], [$Bool], false, 0], ["IsUndefined", "IsUndefined", "", [], [$Bool], false, 0], ["Length", "Length", "", [], [$Int], false, 0], ["New", "New", "", [($sliceType($emptyInterface))], [js.Object], true, 0], ["Set", "Set", "", [$String, $emptyInterface], [], false, 0], ["SetIndex", "SetIndex", "", [$Int, $emptyInterface], [], false, 0], ["Str", "Str", "", [], [$String], false, 0], ["Uint64", "Uint64", "", [], [$Uint64], false, 0], ["Unsafe", "Unsafe", "", [], [$Uintptr], false, 0]];
		DummyJsObj.init([["Object", "", "", js.Object, ""]]);
		Injector.methods = [["Apply", "Apply", "", [$emptyInterface], [$error], false, 0], ["Get", "Get", "", [reflect.Type], [reflect.Value], false, 0], ["Invoke", "Invoke", "", [$emptyInterface], [($sliceType(reflect.Value)), $error], false, 0], ["Map", "Map", "", [$emptyInterface], [inject.TypeMapper], false, 0], ["MapTo", "MapTo", "", [$emptyInterface, $emptyInterface], [inject.TypeMapper], false, 0], ["SetParent", "SetParent", "", [inject.Injector], [], false, 0]];
		($ptrType(Injector)).methods = [["Apply", "Apply", "", [$emptyInterface], [$error], false, 0], ["Get", "Get", "", [reflect.Type], [reflect.Value], false, 0], ["Invoke", "Invoke", "", [$emptyInterface], [($sliceType(reflect.Value)), $error], false, 0], ["Map", "Map", "", [$emptyInterface], [inject.TypeMapper], false, 0], ["MapTo", "MapTo", "", [$emptyInterface, $emptyInterface], [inject.TypeMapper], false, 0], ["SetParent", "SetParent", "", [inject.Injector], [], false, 0], ["_angularDeps", "_angularDeps", "github.com/gopherjs/go-angularjs", [$emptyInterface, ($funcType([reflect.Value], [reflect.Value], false))], [($sliceType($emptyInterface))], false, -1], ["angularDeps", "angularDeps", "github.com/gopherjs/go-angularjs", [$emptyInterface], [($sliceType($emptyInterface))], false, -1], ["requestedProviders", "requestedProviders", "github.com/gopherjs/go-angularjs", [$emptyInterface], [($sliceType(provider))], false, -1]];
		Injector.init([["Injector", "", "", inject.Injector, ""], ["providers", "providers", "github.com/gopherjs/go-angularjs", ($mapType(reflect.Type, provider)), ""]]);
		Angular.init([["Inj", "Inj", "", ($ptrType(Injector)), ""]]);
		Module.methods = [["Bool", "Bool", "", [], [$Bool], false, 0], ["Call", "Call", "", [$String, ($sliceType($emptyInterface))], [js.Object], true, 0], ["Delete", "Delete", "", [$String], [], false, 0], ["Float", "Float", "", [], [$Float64], false, 0], ["Get", "Get", "", [$String], [js.Object], false, 0], ["Index", "Index", "", [$Int], [js.Object], false, 0], ["Int", "Int", "", [], [$Int], false, 0], ["Int64", "Int64", "", [], [$Int64], false, 0], ["Interface", "Interface", "", [], [$emptyInterface], false, 0], ["Invoke", "Invoke", "", [($sliceType($emptyInterface))], [js.Object], true, 0], ["IsNull", "IsNull", "", [], [$Bool], false, 0], ["IsUndefined", "IsUndefined", "", [], [$Bool], false, 0], ["Length", "Length", "", [], [$Int], false, 0], ["New", "New", "", [($sliceType($emptyInterface))], [js.Object], true, 0], ["Set", "Set", "", [$String, $emptyInterface], [], false, 0], ["SetIndex", "SetIndex", "", [$Int, $emptyInterface], [], false, 0], ["Str", "Str", "", [], [$String], false, 0], ["Uint64", "Uint64", "", [], [$Uint64], false, 0], ["Unsafe", "Unsafe", "", [], [$Uintptr], false, 0]];
		($ptrType(Module)).methods = [["Bool", "Bool", "", [], [$Bool], false, 0], ["Call", "Call", "", [$String, ($sliceType($emptyInterface))], [js.Object], true, 0], ["Config", "Config", "", [$emptyInterface], [], false, -1], ["Delete", "Delete", "", [$String], [], false, 0], ["Factory", "Factory", "", [$String, $emptyInterface], [], false, -1], ["Float", "Float", "", [], [$Float64], false, 0], ["Get", "Get", "", [$String], [js.Object], false, 0], ["Index", "Index", "", [$Int], [js.Object], false, 0], ["Int", "Int", "", [], [$Int], false, 0], ["Int64", "Int64", "", [], [$Int64], false, 0], ["Interface", "Interface", "", [], [$emptyInterface], false, 0], ["Invoke", "Invoke", "", [($sliceType($emptyInterface))], [js.Object], true, 0], ["IsNull", "IsNull", "", [], [$Bool], false, 0], ["IsUndefined", "IsUndefined", "", [], [$Bool], false, 0], ["Length", "Length", "", [], [$Int], false, 0], ["New", "New", "", [($sliceType($emptyInterface))], [js.Object], true, 0], ["NewController", "NewController", "", [$String, $emptyInterface], [], false, -1], ["Set", "Set", "", [$String, $emptyInterface], [], false, 0], ["SetIndex", "SetIndex", "", [$Int, $emptyInterface], [], false, 0], ["Str", "Str", "", [], [$String], false, 0], ["Uint64", "Uint64", "", [], [$Uint64], false, 0], ["Unsafe", "Unsafe", "", [], [$Uintptr], false, 0]];
		Module.init([["Object", "", "", js.Object, ""]]);
		provider.init([["AngularName", "AngularName", "", [], [$String], false], ["SetJs", "SetJs", "", [js.Object], [], false]]);
		Provider.methods = [["Bool", "Bool", "", [], [$Bool], false, 0], ["Call", "Call", "", [$String, ($sliceType($emptyInterface))], [js.Object], true, 0], ["Delete", "Delete", "", [$String], [], false, 0], ["Float", "Float", "", [], [$Float64], false, 0], ["Get", "Get", "", [$String], [js.Object], false, 0], ["Index", "Index", "", [$Int], [js.Object], false, 0], ["Int", "Int", "", [], [$Int], false, 0], ["Int64", "Int64", "", [], [$Int64], false, 0], ["Interface", "Interface", "", [], [$emptyInterface], false, 0], ["Invoke", "Invoke", "", [($sliceType($emptyInterface))], [js.Object], true, 0], ["IsNull", "IsNull", "", [], [$Bool], false, 0], ["IsUndefined", "IsUndefined", "", [], [$Bool], false, 0], ["Length", "Length", "", [], [$Int], false, 0], ["New", "New", "", [($sliceType($emptyInterface))], [js.Object], true, 0], ["Set", "Set", "", [$String, $emptyInterface], [], false, 0], ["SetIndex", "SetIndex", "", [$Int, $emptyInterface], [], false, 0], ["Str", "Str", "", [], [$String], false, 0], ["Uint64", "Uint64", "", [], [$Uint64], false, 0], ["Unsafe", "Unsafe", "", [], [$Uintptr], false, 0]];
		($ptrType(Provider)).methods = [["AngularName", "AngularName", "", [], [$String], false, -1], ["Bool", "Bool", "", [], [$Bool], false, 0], ["Call", "Call", "", [$String, ($sliceType($emptyInterface))], [js.Object], true, 0], ["Delete", "Delete", "", [$String], [], false, 0], ["Float", "Float", "", [], [$Float64], false, 0], ["Get", "Get", "", [$String], [js.Object], false, 0], ["Index", "Index", "", [$Int], [js.Object], false, 0], ["Int", "Int", "", [], [$Int], false, 0], ["Int64", "Int64", "", [], [$Int64], false, 0], ["Interface", "Interface", "", [], [$emptyInterface], false, 0], ["Invoke", "Invoke", "", [($sliceType($emptyInterface))], [js.Object], true, 0], ["IsNull", "IsNull", "", [], [$Bool], false, 0], ["IsUndefined", "IsUndefined", "", [], [$Bool], false, 0], ["Length", "Length", "", [], [$Int], false, 0], ["New", "New", "", [($sliceType($emptyInterface))], [js.Object], true, 0], ["Set", "Set", "", [$String, $emptyInterface], [], false, 0], ["SetIndex", "SetIndex", "", [$Int, $emptyInterface], [], false, 0], ["SetJs", "SetJs", "", [js.Object], [], false, -1], ["Str", "Str", "", [], [$String], false, 0], ["Uint64", "Uint64", "", [], [$Uint64], false, 0], ["Unsafe", "Unsafe", "", [], [$Uintptr], false, 0]];
		Provider.init([["Object", "", "", js.Object, ""], ["angularName", "angularName", "github.com/gopherjs/go-angularjs", $String, ""]]);
		Interval.methods = [["AngularName", "AngularName", "", [], [$String], false, 0], ["Bool", "Bool", "", [], [$Bool], false, 0], ["Call", "Call", "", [$String, ($sliceType($emptyInterface))], [js.Object], true, 0], ["Delete", "Delete", "", [$String], [], false, 0], ["Float", "Float", "", [], [$Float64], false, 0], ["Get", "Get", "", [$String], [js.Object], false, 0], ["Index", "Index", "", [$Int], [js.Object], false, 0], ["Int", "Int", "", [], [$Int], false, 0], ["Int64", "Int64", "", [], [$Int64], false, 0], ["Interface", "Interface", "", [], [$emptyInterface], false, 0], ["Invoke", "Invoke", "", [($sliceType($emptyInterface))], [js.Object], true, 0], ["IsNull", "IsNull", "", [], [$Bool], false, 0], ["IsUndefined", "IsUndefined", "", [], [$Bool], false, 0], ["Length", "Length", "", [], [$Int], false, 0], ["New", "New", "", [($sliceType($emptyInterface))], [js.Object], true, 0], ["Set", "Set", "", [$String, $emptyInterface], [], false, 0], ["SetIndex", "SetIndex", "", [$Int, $emptyInterface], [], false, 0], ["SetJs", "SetJs", "", [js.Object], [], false, 0], ["Str", "Str", "", [], [$String], false, 0], ["Uint64", "Uint64", "", [], [$Uint64], false, 0], ["Unsafe", "Unsafe", "", [], [$Uintptr], false, 0]];
		($ptrType(Interval)).methods = [["AngularName", "AngularName", "", [], [$String], false, 0], ["Bool", "Bool", "", [], [$Bool], false, 0], ["Call", "Call", "", [$String, ($sliceType($emptyInterface))], [js.Object], true, 0], ["Delete", "Delete", "", [$String], [], false, 0], ["Float", "Float", "", [], [$Float64], false, 0], ["Get", "Get", "", [$String], [js.Object], false, 0], ["Index", "Index", "", [$Int], [js.Object], false, 0], ["Int", "Int", "", [], [$Int], false, 0], ["Int64", "Int64", "", [], [$Int64], false, 0], ["Interface", "Interface", "", [], [$emptyInterface], false, 0], ["Invoke", "Invoke", "", [($sliceType($emptyInterface))], [js.Object], true, 0], ["IsNull", "IsNull", "", [], [$Bool], false, 0], ["IsUndefined", "IsUndefined", "", [], [$Bool], false, 0], ["Length", "Length", "", [], [$Int], false, 0], ["New", "New", "", [($sliceType($emptyInterface))], [js.Object], true, 0], ["Set", "Set", "", [$String, $emptyInterface], [], false, 0], ["SetIndex", "SetIndex", "", [$Int, $emptyInterface], [], false, 0], ["SetJs", "SetJs", "", [js.Object], [], false, 0], ["Str", "Str", "", [], [$String], false, 0], ["Uint64", "Uint64", "", [], [$Uint64], false, 0], ["Unsafe", "Unsafe", "", [], [$Uintptr], false, 0]];
		Interval.init([["Provider", "", "", ($ptrType(Provider)), ""]]);
		Scope.methods = [["AngularName", "AngularName", "", [], [$String], false, 0], ["Bool", "Bool", "", [], [$Bool], false, 0], ["Call", "Call", "", [$String, ($sliceType($emptyInterface))], [js.Object], true, 0], ["Delete", "Delete", "", [$String], [], false, 0], ["Float", "Float", "", [], [$Float64], false, 0], ["Get", "Get", "", [$String], [js.Object], false, 0], ["Index", "Index", "", [$Int], [js.Object], false, 0], ["Int", "Int", "", [], [$Int], false, 0], ["Int64", "Int64", "", [], [$Int64], false, 0], ["Interface", "Interface", "", [], [$emptyInterface], false, 0], ["Invoke", "Invoke", "", [($sliceType($emptyInterface))], [js.Object], true, 0], ["IsNull", "IsNull", "", [], [$Bool], false, 0], ["IsUndefined", "IsUndefined", "", [], [$Bool], false, 0], ["Length", "Length", "", [], [$Int], false, 0], ["New", "New", "", [($sliceType($emptyInterface))], [js.Object], true, 0], ["Set", "Set", "", [$String, $emptyInterface], [], false, 0], ["SetIndex", "SetIndex", "", [$Int, $emptyInterface], [], false, 0], ["SetJs", "SetJs", "", [js.Object], [], false, 0], ["Str", "Str", "", [], [$String], false, 0], ["Uint64", "Uint64", "", [], [$Uint64], false, 0], ["Unsafe", "Unsafe", "", [], [$Uintptr], false, 0]];
		($ptrType(Scope)).methods = [["AngularName", "AngularName", "", [], [$String], false, 0], ["Apply", "Apply", "", [($funcType([], [], false))], [], false, -1], ["Bool", "Bool", "", [], [$Bool], false, 0], ["Call", "Call", "", [$String, ($sliceType($emptyInterface))], [js.Object], true, 0], ["Delete", "Delete", "", [$String], [], false, 0], ["EvalAsync", "EvalAsync", "", [($funcType([], [], false))], [], false, -1], ["Float", "Float", "", [], [$Float64], false, 0], ["Get", "Get", "", [$String], [js.Object], false, 0], ["Index", "Index", "", [$Int], [js.Object], false, 0], ["Int", "Int", "", [], [$Int], false, 0], ["Int64", "Int64", "", [], [$Int64], false, 0], ["Interface", "Interface", "", [], [$emptyInterface], false, 0], ["Invoke", "Invoke", "", [($sliceType($emptyInterface))], [js.Object], true, 0], ["IsNull", "IsNull", "", [], [$Bool], false, 0], ["IsUndefined", "IsUndefined", "", [], [$Bool], false, 0], ["Length", "Length", "", [], [$Int], false, 0], ["New", "New", "", [($sliceType($emptyInterface))], [js.Object], true, 0], ["Set", "Set", "", [$String, $emptyInterface], [], false, 0], ["SetIndex", "SetIndex", "", [$Int, $emptyInterface], [], false, 0], ["SetJs", "SetJs", "", [js.Object], [], false, 0], ["Str", "Str", "", [], [$String], false, 0], ["Uint64", "Uint64", "", [], [$Uint64], false, 0], ["Unsafe", "Unsafe", "", [], [$Uintptr], false, 0]];
		Scope.init([["Provider", "", "", ($ptrType(Provider)), ""]]);
		headersGetter.init([$String], [$String], false);
		HttpTransformFunc.init([$String, headersGetter], [$String], false);
		ReqMethod.init([["Value", "Value", "", httpMethod, ""]]);
		ReqUrl.init([["Value", "Value", "", $String, ""]]);
		ReqParams.init([["Value", "Value", "", ($mapType($String, $String)), ""]]);
		ReqData.init([["Value", "Value", "", $String, ""]]);
		ReqHeaders.init([["Value", "Value", "", ($mapType($String, $String)), ""]]);
		ReqTransformReqFunc.init([["Value", "Value", "", HttpTransformFunc, ""]]);
		ReqTransformRespFunc.init([["Value", "Value", "", HttpTransformFunc, ""]]);
		ReqTimeout.init([["Value", "Value", "", $Int, ""]]);
		ReqSpec.init([["Method", "Method", "", ReqMethod, "js:\"method\""], ["Url", "Url", "", ReqUrl, "js:\"url\""], ["Params", "Params", "", ReqParams, "js:\"params\""], ["Data", "Data", "", ReqData, "js:\"data\""], ["Headers", "Headers", "", ReqHeaders, "js:\"headers\""], ["TransformReq", "TransformReq", "", ReqTransformReqFunc, "js:\"transformRequest\""], ["TransformResp", "TransformResp", "", ReqTransformRespFunc, "js:\"transformResponse\""], ["Timeout", "Timeout", "", ReqTimeout, "js:\"timeout\""]]);
		ReqOpts.methods = [["ExportToMap", "ExportToMap", "", [], [($mapType($String, $emptyInterface))], false, 0], ["ExportToMapWithTag", "ExportToMapWithTag", "", [$String], [($mapType($String, $emptyInterface))], false, 0], ["Get", "Get", "", [], [$emptyInterface], false, 0], ["IsSet", "IsSet", "", [$String], [$Bool], false, 0], ["Options", "Options", "", [($sliceType(options.Option))], [($ptrType(options.OptionsProvider))], true, 0]];
		($ptrType(ReqOpts)).methods = [["ExportToMap", "ExportToMap", "", [], [($mapType($String, $emptyInterface))], false, 0], ["ExportToMapWithTag", "ExportToMapWithTag", "", [$String], [($mapType($String, $emptyInterface))], false, 0], ["Get", "Get", "", [], [$emptyInterface], false, 0], ["IsSet", "IsSet", "", [$String], [$Bool], false, 0], ["Options", "Options", "", [($sliceType(options.Option))], [($ptrType(options.OptionsProvider))], true, 0], ["Spec", "Spec", "", [], [($ptrType(ReqSpec))], false, -1], ["toJs", "toJs", "github.com/gopherjs/go-angularjs", [], [($mapType($String, $emptyInterface))], false, 0]];
		ReqOpts.init([["AngularOpts", "", "", AngularOpts, ""]]);
		HttpService.methods = [["AngularName", "AngularName", "", [], [$String], false, 0], ["Bool", "Bool", "", [], [$Bool], false, 0], ["Call", "Call", "", [$String, ($sliceType($emptyInterface))], [js.Object], true, 0], ["Delete", "Delete", "", [$String], [], false, 0], ["Float", "Float", "", [], [$Float64], false, 0], ["Index", "Index", "", [$Int], [js.Object], false, 0], ["Int", "Int", "", [], [$Int], false, 0], ["Int64", "Int64", "", [], [$Int64], false, 0], ["Interface", "Interface", "", [], [$emptyInterface], false, 0], ["Invoke", "Invoke", "", [($sliceType($emptyInterface))], [js.Object], true, 0], ["IsNull", "IsNull", "", [], [$Bool], false, 0], ["IsUndefined", "IsUndefined", "", [], [$Bool], false, 0], ["Length", "Length", "", [], [$Int], false, 0], ["New", "New", "", [($sliceType($emptyInterface))], [js.Object], true, 0], ["Set", "Set", "", [$String, $emptyInterface], [], false, 0], ["SetIndex", "SetIndex", "", [$Int, $emptyInterface], [], false, 0], ["SetJs", "SetJs", "", [js.Object], [], false, 0], ["Str", "Str", "", [], [$String], false, 0], ["Uint64", "Uint64", "", [], [$Uint64], false, 0], ["Unsafe", "Unsafe", "", [], [$Uintptr], false, 0]];
		($ptrType(HttpService)).methods = [["AngularName", "AngularName", "", [], [$String], false, 0], ["Bool", "Bool", "", [], [$Bool], false, 0], ["Call", "Call", "", [$String, ($sliceType($emptyInterface))], [js.Object], true, 0], ["Delete", "Delete", "", [$String], [], false, 0], ["Float", "Float", "", [], [$Float64], false, 0], ["Get", "Get", "", [$String], [($ptrType(Future))], false, -1], ["Index", "Index", "", [$Int], [js.Object], false, 0], ["Int", "Int", "", [], [$Int], false, 0], ["Int64", "Int64", "", [], [$Int64], false, 0], ["Interface", "Interface", "", [], [$emptyInterface], false, 0], ["Invoke", "Invoke", "", [($sliceType($emptyInterface))], [js.Object], true, 0], ["IsNull", "IsNull", "", [], [$Bool], false, 0], ["IsUndefined", "IsUndefined", "", [], [$Bool], false, 0], ["Length", "Length", "", [], [$Int], false, 0], ["New", "New", "", [($sliceType($emptyInterface))], [js.Object], true, 0], ["Request", "Request", "", [($ptrType(ReqOpts))], [($ptrType(Future))], false, -1], ["Set", "Set", "", [$String, $emptyInterface], [], false, 0], ["SetIndex", "SetIndex", "", [$Int, $emptyInterface], [], false, 0], ["SetJs", "SetJs", "", [js.Object], [], false, 0], ["SimpleRequest", "SimpleRequest", "", [httpMethod, $String], [($ptrType(Future))], false, -1], ["Str", "Str", "", [], [$String], false, 0], ["Uint64", "Uint64", "", [], [$Uint64], false, 0], ["Unsafe", "Unsafe", "", [], [$Uintptr], false, 0]];
		HttpService.init([["Provider", "", "", ($ptrType(Provider)), ""]]);
		HttpProvider.methods = [["AngularName", "AngularName", "", [], [$String], false, 0], ["Bool", "Bool", "", [], [$Bool], false, 0], ["Call", "Call", "", [$String, ($sliceType($emptyInterface))], [js.Object], true, 0], ["Delete", "Delete", "", [$String], [], false, 0], ["Float", "Float", "", [], [$Float64], false, 0], ["Get", "Get", "", [$String], [js.Object], false, 0], ["Index", "Index", "", [$Int], [js.Object], false, 0], ["Int", "Int", "", [], [$Int], false, 0], ["Int64", "Int64", "", [], [$Int64], false, 0], ["Interface", "Interface", "", [], [$emptyInterface], false, 0], ["Invoke", "Invoke", "", [($sliceType($emptyInterface))], [js.Object], true, 0], ["IsNull", "IsNull", "", [], [$Bool], false, 0], ["IsUndefined", "IsUndefined", "", [], [$Bool], false, 0], ["Length", "Length", "", [], [$Int], false, 0], ["New", "New", "", [($sliceType($emptyInterface))], [js.Object], true, 0], ["Set", "Set", "", [$String, $emptyInterface], [], false, 0], ["SetIndex", "SetIndex", "", [$Int, $emptyInterface], [], false, 0], ["SetJs", "SetJs", "", [js.Object], [], false, 0], ["Str", "Str", "", [], [$String], false, 0], ["Uint64", "Uint64", "", [], [$Uint64], false, 0], ["Unsafe", "Unsafe", "", [], [$Uintptr], false, 0]];
		($ptrType(HttpProvider)).methods = [["AngularName", "AngularName", "", [], [$String], false, 0], ["Bool", "Bool", "", [], [$Bool], false, 0], ["Call", "Call", "", [$String, ($sliceType($emptyInterface))], [js.Object], true, 0], ["Delete", "Delete", "", [$String], [], false, 0], ["Float", "Float", "", [], [$Float64], false, 0], ["Get", "Get", "", [$String], [js.Object], false, 0], ["Index", "Index", "", [$Int], [js.Object], false, 0], ["Int", "Int", "", [], [$Int], false, 0], ["Int64", "Int64", "", [], [$Int64], false, 0], ["Interface", "Interface", "", [], [$emptyInterface], false, 0], ["Invoke", "Invoke", "", [($sliceType($emptyInterface))], [js.Object], true, 0], ["IsNull", "IsNull", "", [], [$Bool], false, 0], ["IsUndefined", "IsUndefined", "", [], [$Bool], false, 0], ["Length", "Length", "", [], [$Int], false, 0], ["New", "New", "", [($sliceType($emptyInterface))], [js.Object], true, 0], ["Set", "Set", "", [$String, $emptyInterface], [], false, 0], ["SetIndex", "SetIndex", "", [$Int, $emptyInterface], [], false, 0], ["SetJs", "SetJs", "", [js.Object], [], false, 0], ["Str", "Str", "", [], [$String], false, 0], ["Uint64", "Uint64", "", [], [$Uint64], false, 0], ["Unsafe", "Unsafe", "", [], [$Uintptr], false, 0]];
		HttpProvider.init([["Provider", "", "", ($ptrType(Provider)), ""]]);
		Future.methods = [["Bool", "Bool", "", [], [$Bool], false, 0], ["Call", "Call", "", [$String, ($sliceType($emptyInterface))], [js.Object], true, 0], ["Delete", "Delete", "", [$String], [], false, 0], ["Float", "Float", "", [], [$Float64], false, 0], ["Get", "Get", "", [$String], [js.Object], false, 0], ["Index", "Index", "", [$Int], [js.Object], false, 0], ["Int", "Int", "", [], [$Int], false, 0], ["Int64", "Int64", "", [], [$Int64], false, 0], ["Interface", "Interface", "", [], [$emptyInterface], false, 0], ["Invoke", "Invoke", "", [($sliceType($emptyInterface))], [js.Object], true, 0], ["IsNull", "IsNull", "", [], [$Bool], false, 0], ["IsUndefined", "IsUndefined", "", [], [$Bool], false, 0], ["Length", "Length", "", [], [$Int], false, 0], ["New", "New", "", [($sliceType($emptyInterface))], [js.Object], true, 0], ["Set", "Set", "", [$String, $emptyInterface], [], false, 0], ["SetIndex", "SetIndex", "", [$Int, $emptyInterface], [], false, 0], ["Str", "Str", "", [], [$String], false, 0], ["Uint64", "Uint64", "", [], [$Uint64], false, 0], ["Unsafe", "Unsafe", "", [], [$Uintptr], false, 0]];
		($ptrType(Future)).methods = [["Bool", "Bool", "", [], [$Bool], false, 0], ["Call", "Call", "", [$String, ($sliceType($emptyInterface))], [js.Object], true, 0], ["Delete", "Delete", "", [$String], [], false, 0], ["Error", "Error", "", [RequestCallback], [($ptrType(Future))], false, -1], ["Float", "Float", "", [], [$Float64], false, 0], ["Get", "Get", "", [$String], [js.Object], false, 0], ["Index", "Index", "", [$Int], [js.Object], false, 0], ["Int", "Int", "", [], [$Int], false, 0], ["Int64", "Int64", "", [], [$Int64], false, 0], ["Interface", "Interface", "", [], [$emptyInterface], false, 0], ["Invoke", "Invoke", "", [($sliceType($emptyInterface))], [js.Object], true, 0], ["IsNull", "IsNull", "", [], [$Bool], false, 0], ["IsUndefined", "IsUndefined", "", [], [$Bool], false, 0], ["Length", "Length", "", [], [$Int], false, 0], ["New", "New", "", [($sliceType($emptyInterface))], [js.Object], true, 0], ["Set", "Set", "", [$String, $emptyInterface], [], false, 0], ["SetIndex", "SetIndex", "", [$Int, $emptyInterface], [], false, 0], ["Str", "Str", "", [], [$String], false, 0], ["Success", "Success", "", [RequestCallback], [($ptrType(Future))], false, -1], ["Uint64", "Uint64", "", [], [$Uint64], false, 0], ["Unsafe", "Unsafe", "", [], [$Uintptr], false, 0], ["call", "call", "github.com/gopherjs/go-angularjs", [$String, RequestCallback], [($ptrType(Future))], false, -1]];
		Future.init([["Object", "", "", js.Object, ""]]);
		RequestCallback.init([]);
		RootScope.methods = [["AngularName", "AngularName", "", [], [$String], false, 0], ["Bool", "Bool", "", [], [$Bool], false, 0], ["Call", "Call", "", [$String, ($sliceType($emptyInterface))], [js.Object], true, 0], ["Delete", "Delete", "", [$String], [], false, 0], ["Float", "Float", "", [], [$Float64], false, 0], ["Get", "Get", "", [$String], [js.Object], false, 0], ["Index", "Index", "", [$Int], [js.Object], false, 0], ["Int", "Int", "", [], [$Int], false, 0], ["Int64", "Int64", "", [], [$Int64], false, 0], ["Interface", "Interface", "", [], [$emptyInterface], false, 0], ["Invoke", "Invoke", "", [($sliceType($emptyInterface))], [js.Object], true, 0], ["IsNull", "IsNull", "", [], [$Bool], false, 0], ["IsUndefined", "IsUndefined", "", [], [$Bool], false, 0], ["Length", "Length", "", [], [$Int], false, 0], ["New", "New", "", [($sliceType($emptyInterface))], [js.Object], true, 0], ["Set", "Set", "", [$String, $emptyInterface], [], false, 0], ["SetIndex", "SetIndex", "", [$Int, $emptyInterface], [], false, 0], ["SetJs", "SetJs", "", [js.Object], [], false, 0], ["Str", "Str", "", [], [$String], false, 0], ["Uint64", "Uint64", "", [], [$Uint64], false, 0], ["Unsafe", "Unsafe", "", [], [$Uintptr], false, 0]];
		($ptrType(RootScope)).methods = [["AngularName", "AngularName", "", [], [$String], false, 0], ["Bool", "Bool", "", [], [$Bool], false, 0], ["Call", "Call", "", [$String, ($sliceType($emptyInterface))], [js.Object], true, 0], ["Delete", "Delete", "", [$String], [], false, 0], ["Float", "Float", "", [], [$Float64], false, 0], ["Get", "Get", "", [$String], [js.Object], false, 0], ["Index", "Index", "", [$Int], [js.Object], false, 0], ["Int", "Int", "", [], [$Int], false, 0], ["Int64", "Int64", "", [], [$Int64], false, 0], ["Interface", "Interface", "", [], [$emptyInterface], false, 0], ["Invoke", "Invoke", "", [($sliceType($emptyInterface))], [js.Object], true, 0], ["IsNull", "IsNull", "", [], [$Bool], false, 0], ["IsUndefined", "IsUndefined", "", [], [$Bool], false, 0], ["Length", "Length", "", [], [$Int], false, 0], ["New", "New", "", [($sliceType($emptyInterface))], [js.Object], true, 0], ["Set", "Set", "", [$String, $emptyInterface], [], false, 0], ["SetIndex", "SetIndex", "", [$Int, $emptyInterface], [], false, 0], ["SetJs", "SetJs", "", [js.Object], [], false, 0], ["Str", "Str", "", [], [$String], false, 0], ["Uint64", "Uint64", "", [], [$Uint64], false, 0], ["Unsafe", "Unsafe", "", [], [$Uintptr], false, 0]];
		RootScope.init([["Provider", "", "", ($ptrType(Provider)), ""]]);
		QProvider.methods = [["AngularName", "AngularName", "", [], [$String], false, 0], ["Bool", "Bool", "", [], [$Bool], false, 0], ["Call", "Call", "", [$String, ($sliceType($emptyInterface))], [js.Object], true, 0], ["Delete", "Delete", "", [$String], [], false, 0], ["Float", "Float", "", [], [$Float64], false, 0], ["Get", "Get", "", [$String], [js.Object], false, 0], ["Index", "Index", "", [$Int], [js.Object], false, 0], ["Int", "Int", "", [], [$Int], false, 0], ["Int64", "Int64", "", [], [$Int64], false, 0], ["Interface", "Interface", "", [], [$emptyInterface], false, 0], ["Invoke", "Invoke", "", [($sliceType($emptyInterface))], [js.Object], true, 0], ["IsNull", "IsNull", "", [], [$Bool], false, 0], ["IsUndefined", "IsUndefined", "", [], [$Bool], false, 0], ["Length", "Length", "", [], [$Int], false, 0], ["New", "New", "", [($sliceType($emptyInterface))], [js.Object], true, 0], ["Set", "Set", "", [$String, $emptyInterface], [], false, 0], ["SetIndex", "SetIndex", "", [$Int, $emptyInterface], [], false, 0], ["SetJs", "SetJs", "", [js.Object], [], false, 0], ["Str", "Str", "", [], [$String], false, 0], ["Uint64", "Uint64", "", [], [$Uint64], false, 0], ["Unsafe", "Unsafe", "", [], [$Uintptr], false, 0]];
		($ptrType(QProvider)).methods = [["All", "All", "", [($sliceType(js.Object))], [js.Object], false, -1], ["AngularName", "AngularName", "", [], [$String], false, 0], ["Bool", "Bool", "", [], [$Bool], false, 0], ["Call", "Call", "", [$String, ($sliceType($emptyInterface))], [js.Object], true, 0], ["Defer", "Defer", "", [], [js.Object], false, -1], ["Delete", "Delete", "", [$String], [], false, 0], ["Float", "Float", "", [], [$Float64], false, 0], ["Get", "Get", "", [$String], [js.Object], false, 0], ["Index", "Index", "", [$Int], [js.Object], false, 0], ["Int", "Int", "", [], [$Int], false, 0], ["Int64", "Int64", "", [], [$Int64], false, 0], ["Interface", "Interface", "", [], [$emptyInterface], false, 0], ["Invoke", "Invoke", "", [($sliceType($emptyInterface))], [js.Object], true, 0], ["IsNull", "IsNull", "", [], [$Bool], false, 0], ["IsUndefined", "IsUndefined", "", [], [$Bool], false, 0], ["Length", "Length", "", [], [$Int], false, 0], ["New", "New", "", [($sliceType($emptyInterface))], [js.Object], true, 0], ["NowOrLater", "NowOrLater", "", [js.Object], [$emptyInterface], false, -1], ["Reject", "Reject", "", [$String], [js.Object], false, -1], ["Set", "Set", "", [$String, $emptyInterface], [], false, 0], ["SetIndex", "SetIndex", "", [$Int, $emptyInterface], [], false, 0], ["SetJs", "SetJs", "", [js.Object], [], false, 0], ["Str", "Str", "", [], [$String], false, 0], ["Uint64", "Uint64", "", [], [$Uint64], false, 0], ["Unsafe", "Unsafe", "", [], [$Uintptr], false, 0], ["When", "When", "", [js.Object], [js.Object], false, -1]];
		QProvider.init([["Provider", "", "", ($ptrType(Provider)), ""]]);
		RouteOpts.methods = [["ExportToMap", "ExportToMap", "", [], [($mapType($String, $emptyInterface))], false, 0], ["ExportToMapWithTag", "ExportToMapWithTag", "", [$String], [($mapType($String, $emptyInterface))], false, 0], ["Get", "Get", "", [], [$emptyInterface], false, 0], ["IsSet", "IsSet", "", [$String], [$Bool], false, 0], ["Options", "Options", "", [($sliceType(options.Option))], [($ptrType(options.OptionsProvider))], true, 0]];
		($ptrType(RouteOpts)).methods = [["ExportToMap", "ExportToMap", "", [], [($mapType($String, $emptyInterface))], false, 0], ["ExportToMapWithTag", "ExportToMapWithTag", "", [$String], [($mapType($String, $emptyInterface))], false, 0], ["Get", "Get", "", [], [$emptyInterface], false, 0], ["IsSet", "IsSet", "", [$String], [$Bool], false, 0], ["Options", "Options", "", [($sliceType(options.Option))], [($ptrType(options.OptionsProvider))], true, 0], ["toJs", "toJs", "github.com/gopherjs/go-angularjs", [], [($mapType($String, $emptyInterface))], false, 0]];
		RouteOpts.init([["AngularOpts", "", "", AngularOpts, ""]]);
		RouteProvider.methods = [["AngularName", "AngularName", "", [], [$String], false, 0], ["Bool", "Bool", "", [], [$Bool], false, 0], ["Call", "Call", "", [$String, ($sliceType($emptyInterface))], [js.Object], true, 0], ["Delete", "Delete", "", [$String], [], false, 0], ["Float", "Float", "", [], [$Float64], false, 0], ["Get", "Get", "", [$String], [js.Object], false, 0], ["Index", "Index", "", [$Int], [js.Object], false, 0], ["Int", "Int", "", [], [$Int], false, 0], ["Int64", "Int64", "", [], [$Int64], false, 0], ["Interface", "Interface", "", [], [$emptyInterface], false, 0], ["Invoke", "Invoke", "", [($sliceType($emptyInterface))], [js.Object], true, 0], ["IsNull", "IsNull", "", [], [$Bool], false, 0], ["IsUndefined", "IsUndefined", "", [], [$Bool], false, 0], ["Length", "Length", "", [], [$Int], false, 0], ["New", "New", "", [($sliceType($emptyInterface))], [js.Object], true, 0], ["Set", "Set", "", [$String, $emptyInterface], [], false, 0], ["SetIndex", "SetIndex", "", [$Int, $emptyInterface], [], false, 0], ["SetJs", "SetJs", "", [js.Object], [], false, 0], ["Str", "Str", "", [], [$String], false, 0], ["Uint64", "Uint64", "", [], [$Uint64], false, 0], ["Unsafe", "Unsafe", "", [], [$Uintptr], false, 0]];
		($ptrType(RouteProvider)).methods = [["AngularName", "AngularName", "", [], [$String], false, 0], ["Bool", "Bool", "", [], [$Bool], false, 0], ["Call", "Call", "", [$String, ($sliceType($emptyInterface))], [js.Object], true, 0], ["Delete", "Delete", "", [$String], [], false, 0], ["Float", "Float", "", [], [$Float64], false, 0], ["Get", "Get", "", [$String], [js.Object], false, 0], ["Index", "Index", "", [$Int], [js.Object], false, 0], ["Int", "Int", "", [], [$Int], false, 0], ["Int64", "Int64", "", [], [$Int64], false, 0], ["Interface", "Interface", "", [], [$emptyInterface], false, 0], ["Invoke", "Invoke", "", [($sliceType($emptyInterface))], [js.Object], true, 0], ["IsNull", "IsNull", "", [], [$Bool], false, 0], ["IsUndefined", "IsUndefined", "", [], [$Bool], false, 0], ["Length", "Length", "", [], [$Int], false, 0], ["New", "New", "", [($sliceType($emptyInterface))], [js.Object], true, 0], ["Otherwise", "Otherwise", "", [($ptrType(RouteOpts))], [], false, -1], ["Set", "Set", "", [$String, $emptyInterface], [], false, 0], ["SetIndex", "SetIndex", "", [$Int, $emptyInterface], [], false, 0], ["SetJs", "SetJs", "", [js.Object], [], false, 0], ["Str", "Str", "", [], [$String], false, 0], ["Uint64", "Uint64", "", [], [$Uint64], false, 0], ["Unsafe", "Unsafe", "", [], [$Uintptr], false, 0], ["When", "When", "", [$String, ($ptrType(RouteOpts))], [($ptrType(RouteProvider))], false, -1]];
		RouteProvider.init([["Provider", "", "", ($ptrType(Provider)), ""]]);
		var _map, _key, x, x$1, x$2, x$3, x$4, x$5, x$6;
		$pkg.AngularProvidersList = (_map = new $Map(), _key = reflect.TypeOf((x = new RouteProvider.Ptr(($ptrType(Provider)).nil), new x.constructor.Struct(x))), _map[(_key || $interfaceNil).$key()] = { k: _key, v: new RouteProvider.Ptr(NewProvider("$routeProvider")) }, _key = reflect.TypeOf((x$1 = new HttpService.Ptr(($ptrType(Provider)).nil), new x$1.constructor.Struct(x$1))), _map[(_key || $interfaceNil).$key()] = { k: _key, v: new HttpService.Ptr(NewProvider("$http")) }, _key = reflect.TypeOf((x$2 = new Scope.Ptr(($ptrType(Provider)).nil), new x$2.constructor.Struct(x$2))), _map[(_key || $interfaceNil).$key()] = { k: _key, v: new Scope.Ptr(NewProvider("$scope")) }, _key = reflect.TypeOf((x$3 = new RootScope.Ptr(($ptrType(Provider)).nil), new x$3.constructor.Struct(x$3))), _map[(_key || $interfaceNil).$key()] = { k: _key, v: new RootScope.Ptr(NewProvider("$rootScope")) }, _key = reflect.TypeOf((x$4 = new QProvider.Ptr(($ptrType(Provider)).nil), new x$4.constructor.Struct(x$4))), _map[(_key || $interfaceNil).$key()] = { k: _key, v: new QProvider.Ptr(NewProvider("$q")) }, _key = reflect.TypeOf((x$5 = new HttpProvider.Ptr(($ptrType(Provider)).nil), new x$5.constructor.Struct(x$5))), _map[(_key || $interfaceNil).$key()] = { k: _key, v: new HttpProvider.Ptr(NewProvider("$httpProvider")) }, _key = reflect.TypeOf((x$6 = new Interval.Ptr(($ptrType(Provider)).nil), new x$6.constructor.Struct(x$6))), _map[(_key || $interfaceNil).$key()] = { k: _key, v: new Interval.Ptr(NewProvider("$interval")) }, _map);
		$pkg.Ng = InitAngular();
	};
	return $pkg;
})();
$packages["main"] = (function() {
	var $pkg = {}, angularjs = $packages["github.com/gopherjs/go-angularjs"], Phone, main;
	Phone = $pkg.Phone = $newType(0, "Struct", "main.Phone", "Phone", "main", function(Name_, Snippet_) {
		this.$val = this;
		this.Name = Name_ !== undefined ? Name_ : "";
		this.Snippet = Snippet_ !== undefined ? Snippet_ : "";
	});
	main = $pkg.main = function() {
		var app;
		app = angularjs.NewModule("gopherJsApp", new ($sliceType($String))([]));
		app.NewController("PhoneListCtrl", new ($funcType([($ptrType(angularjs.Scope))], [], false))((function(scope) {
			scope.Provider.Object.phones = $externalize(new ($sliceType(Phone))([new Phone.Ptr("Nexus S", "Fast just got faster with Nexus S."), new Phone.Ptr("Motorola XOOM\xE2\x84\xA2 with Wi-Fi", "The Next, Next Generation tablet."), new Phone.Ptr("MOTOROLA XOOM\xE2\x84\xA2", "The Next, Next Generation tablet.")]), ($sliceType(Phone)));
		})));
	};
	$pkg.init = function() {
		Phone.init([["Name", "Name", "", $String, ""], ["Snippet", "Snippet", "", $String, ""]]);
	};
	return $pkg;
})();
$error.implementedBy = [$packages["encoding/base64"].CorruptInputError, $packages["encoding/json"].InvalidUnmarshalError.Ptr, $packages["encoding/json"].SyntaxError.Ptr, $packages["encoding/json"].UnmarshalTypeError.Ptr, $packages["errors"].errorString.Ptr, $packages["github.com/gopherjs/gopherjs/js"].Error.Ptr, $packages["os"].PathError.Ptr, $packages["os"].SyscallError.Ptr, $packages["reflect"].ValueError.Ptr, $packages["runtime"].TypeAssertionError.Ptr, $packages["runtime"].errorString, $packages["strconv"].NumError.Ptr, $packages["syscall"].Errno, $packages["time"].ParseError.Ptr, $ptrType($packages["encoding/base64"].CorruptInputError), $ptrType($packages["runtime"].errorString), $ptrType($packages["syscall"].Errno)];
$packages["github.com/gopherjs/gopherjs/js"].Object.implementedBy = [$packages["github.com/gopherjs/go-angularjs"].DummyJsObj, $packages["github.com/gopherjs/go-angularjs"].DummyJsObj.Ptr, $packages["github.com/gopherjs/go-angularjs"].Future, $packages["github.com/gopherjs/go-angularjs"].Future.Ptr, $packages["github.com/gopherjs/go-angularjs"].HttpProvider, $packages["github.com/gopherjs/go-angularjs"].HttpProvider.Ptr, $packages["github.com/gopherjs/go-angularjs"].Interval, $packages["github.com/gopherjs/go-angularjs"].Interval.Ptr, $packages["github.com/gopherjs/go-angularjs"].Module, $packages["github.com/gopherjs/go-angularjs"].Module.Ptr, $packages["github.com/gopherjs/go-angularjs"].Provider, $packages["github.com/gopherjs/go-angularjs"].Provider.Ptr, $packages["github.com/gopherjs/go-angularjs"].QProvider, $packages["github.com/gopherjs/go-angularjs"].QProvider.Ptr, $packages["github.com/gopherjs/go-angularjs"].RootScope, $packages["github.com/gopherjs/go-angularjs"].RootScope.Ptr, $packages["github.com/gopherjs/go-angularjs"].RouteProvider, $packages["github.com/gopherjs/go-angularjs"].RouteProvider.Ptr, $packages["github.com/gopherjs/go-angularjs"].Scope, $packages["github.com/gopherjs/go-angularjs"].Scope.Ptr, $packages["github.com/gopherjs/gopherjs/js"].Error, $packages["github.com/gopherjs/gopherjs/js"].Error.Ptr];
$packages["runtime"].Error.implementedBy = [$packages["runtime"].TypeAssertionError.Ptr, $packages["runtime"].errorString, $ptrType($packages["runtime"].errorString)];
$packages["sync"].Locker.implementedBy = [$packages["sync"].Mutex.Ptr, $packages["sync"].RWMutex.Ptr, $packages["sync"].rlocker.Ptr, $packages["syscall"].mmapper.Ptr];
$packages["io"].Reader.implementedBy = [$packages["bytes"].Buffer.Ptr, $packages["encoding/json"].encodeState.Ptr, $packages["fmt"].ss.Ptr, $packages["os"].File.Ptr];
$packages["io"].RuneReader.implementedBy = [$packages["bytes"].Buffer.Ptr, $packages["encoding/json"].encodeState.Ptr, $packages["fmt"].ss.Ptr];
$packages["io"].Writer.implementedBy = [$packages["bytes"].Buffer.Ptr, $packages["encoding/json"].encodeState.Ptr, $packages["fmt"].pp.Ptr, $packages["os"].File.Ptr, $ptrType($packages["fmt"].buffer)];
$packages["encoding"].TextMarshaler.implementedBy = [$packages["time"].Time, $packages["time"].Time.Ptr];
$packages["encoding"].TextUnmarshaler.implementedBy = [$packages["time"].Time.Ptr];
$packages["os"].FileInfo.implementedBy = [$packages["os"].fileStat.Ptr];
$packages["reflect"].Type.implementedBy = [$packages["reflect"].arrayType.Ptr, $packages["reflect"].chanType.Ptr, $packages["reflect"].funcType.Ptr, $packages["reflect"].interfaceType.Ptr, $packages["reflect"].mapType.Ptr, $packages["reflect"].ptrType.Ptr, $packages["reflect"].rtype.Ptr, $packages["reflect"].sliceType.Ptr, $packages["reflect"].structType.Ptr];
$packages["fmt"].Formatter.implementedBy = [];
$packages["fmt"].GoStringer.implementedBy = [];
$packages["fmt"].State.implementedBy = [$packages["fmt"].pp.Ptr];
$packages["fmt"].Stringer.implementedBy = [$packages["bytes"].Buffer.Ptr, $packages["encoding/json"].Number, $packages["encoding/json"].encodeState.Ptr, $packages["os"].FileMode, $packages["reflect"].ChanDir, $packages["reflect"].Kind, $packages["reflect"].Value, $packages["reflect"].Value.Ptr, $packages["reflect"].arrayType.Ptr, $packages["reflect"].chanType.Ptr, $packages["reflect"].funcType.Ptr, $packages["reflect"].interfaceType.Ptr, $packages["reflect"].mapType.Ptr, $packages["reflect"].ptrType.Ptr, $packages["reflect"].rtype.Ptr, $packages["reflect"].sliceType.Ptr, $packages["reflect"].structType.Ptr, $packages["strconv"].decimal.Ptr, $packages["time"].Duration, $packages["time"].Location.Ptr, $packages["time"].Month, $packages["time"].Time, $packages["time"].Time.Ptr, $packages["time"].Weekday, $ptrType($packages["encoding/json"].Number), $ptrType($packages["os"].FileMode), $ptrType($packages["reflect"].ChanDir), $ptrType($packages["reflect"].Kind), $ptrType($packages["time"].Duration), $ptrType($packages["time"].Month), $ptrType($packages["time"].Weekday)];
$packages["fmt"].runeUnreader.implementedBy = [$packages["bytes"].Buffer.Ptr, $packages["encoding/json"].encodeState.Ptr, $packages["fmt"].ss.Ptr];
$packages["encoding/json"].Marshaler.implementedBy = [$packages["time"].Time, $packages["time"].Time.Ptr];
$packages["encoding/json"].Unmarshaler.implementedBy = [$packages["time"].Time.Ptr];
$packages["github.com/codegangsta/inject"].Injector.implementedBy = [$packages["github.com/codegangsta/inject"].injector.Ptr, $packages["github.com/gopherjs/go-angularjs"].Injector, $packages["github.com/gopherjs/go-angularjs"].Injector.Ptr];
$packages["github.com/codegangsta/inject"].TypeMapper.implementedBy = [$packages["github.com/codegangsta/inject"].injector.Ptr, $packages["github.com/gopherjs/go-angularjs"].Injector, $packages["github.com/gopherjs/go-angularjs"].Injector.Ptr];
$packages["github.com/gopherjs/go-angularjs"].provider.implementedBy = [$packages["github.com/gopherjs/go-angularjs"].HttpProvider, $packages["github.com/gopherjs/go-angularjs"].HttpProvider.Ptr, $packages["github.com/gopherjs/go-angularjs"].HttpService, $packages["github.com/gopherjs/go-angularjs"].HttpService.Ptr, $packages["github.com/gopherjs/go-angularjs"].Interval, $packages["github.com/gopherjs/go-angularjs"].Interval.Ptr, $packages["github.com/gopherjs/go-angularjs"].Provider.Ptr, $packages["github.com/gopherjs/go-angularjs"].QProvider, $packages["github.com/gopherjs/go-angularjs"].QProvider.Ptr, $packages["github.com/gopherjs/go-angularjs"].RootScope, $packages["github.com/gopherjs/go-angularjs"].RootScope.Ptr, $packages["github.com/gopherjs/go-angularjs"].RouteProvider, $packages["github.com/gopherjs/go-angularjs"].RouteProvider.Ptr, $packages["github.com/gopherjs/go-angularjs"].Scope, $packages["github.com/gopherjs/go-angularjs"].Scope.Ptr];
$packages["github.com/gopherjs/gopherjs/js"].init();
$packages["runtime"].init();
$packages["errors"].init();
$packages["sync/atomic"].init();
$packages["sync"].init();
$packages["io"].init();
$packages["unicode"].init();
$packages["unicode/utf8"].init();
$packages["bytes"].init();
$packages["encoding"].init();
$packages["math"].init();
$packages["strconv"].init();
$packages["strings"].init();
$packages["encoding/base64"].init();
$packages["syscall"].init();
$packages["time"].init();
$packages["os"].init();
$packages["reflect"].init();
$packages["fmt"].init();
$packages["sort"].init();
$packages["unicode/utf16"].init();
$packages["encoding/json"].init();
$packages["github.com/codegangsta/inject"].init();
$packages["github.com/phaikawl/options"].init();
$packages["github.com/gopherjs/go-angularjs"].init();
$packages["main"].init();
$packages["main"].main();

})();
//# sourceMappingURL=controllers.js.map
