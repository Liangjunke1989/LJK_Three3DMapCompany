/**
 * 判断类型
 * @param value
 * @param type
 * @returns
 */
export function typeOf(value, type) {
  return Object.prototype.toString.call(value) === `[object ${type}]`;
}
/**
 * 获取后缀
 * @param name 文件名
 * @returns
 */
export function getExtension(name) {
  return name.substring(name.lastIndexOf(".") + 1);
}
export function getFileName(name) {
  const pos = name.lastIndexOf("/");
  const str = name.substring(pos + 1);
  return str;
}
export function getPathInfo(path) {
  // 获取最后一个斜杠位置
  const pos = path.lastIndexOf("/");
  // 获取文件名+后缀
  const file = path.substring(pos + 1);
  // 获取文件前面的路径
  const url = path.substring(0, pos);
  //截取文件名
  const name = file.substring(0, file.lastIndexOf("."));
  // 后缀
  const ext = path.substring(path.lastIndexOf(".") + 1);
  return {
    file,
    url,
    name,
    ext,
  };
}
