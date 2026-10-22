// Um único domínio: execução síncrona com SQLite e assíncrona com PostgreSQL.
// yield aguarda valores/promessas; exceções retornam ao try/catch do domínio.
const isPromise = (value) => value && typeof value.then === "function";
function flow(generator) {
  return function (...args) {
    const iterator = generator.apply(this, args);
    function step(method, value) {
      const result = iterator[method](value);
      if (result.done) return result.value;
      if (isPromise(result.value))
        return Promise.resolve(result.value).then(
          (resolved) => step("next", resolved),
          (error) => step("throw", error),
        );
      return step("next", result.value);
    }
    return step("next");
  };
}
function collect(values) {
  return values.some(isPromise) ? Promise.all(values) : values;
}
function wrapMethods(Type) {
  for (const name of Object.getOwnPropertyNames(Type.prototype)) {
    const fn = Type.prototype[name];
    if (fn?.constructor?.name === "GeneratorFunction")
      Type.prototype[name] = flow(fn);
  }
}
module.exports = { flow, collect, wrapMethods };
