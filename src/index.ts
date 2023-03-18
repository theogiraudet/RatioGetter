import axios from 'axios';
import FormData from 'form-data';
import { parse } from 'node-html-parser';
import fs from 'fs';
import { Infos, Config } from './type';

main()

async function main() {
  const {address, login_path, user, password, result_file, cookie_key} = readConfig()
  const infos = await getInfos(address, login_path, user, password, cookie_key).catch(console.error)
  if(infos)
    await addNewRatioEntry(result_file, infos)
}

function readConfig(): Config | undefined {
  const path = "config.json"
  if(fs.existsSync(path)) {
    return JSON.parse(fs.readFileSync(path, {encoding: "utf-8"}))
  } else {
    console.error("Please, create a config file named 'config.json' in the same folder as the executable.")
    return undefined
  }
}

async function addNewRatioEntry(path: string, infos: Infos) {
  if(!fs.existsSync(path))
    fs.writeFileSync(path, "", {flag: "wx"})
  
  const content: Infos[] = JSON.parse(fs.readFileSync(path, {encoding: "utf-8"}) || "[]")
  content.push(infos)
  fs.writeFileSync(path, JSON.stringify(content))
}

async function getInfos(address: string, loginPath: string, user: string, password: string, cookie_key: string): Promise<Infos> {
  const form = new FormData();
  form.append("id", user);
  form.append("pass", password);

  const response = await axios({
    method: "post",
    url: address + loginPath,
    data: form,
    headers: { 'Content-Type': 'multipart/form-data; boundary=---011000010111000001101001' }
  }).catch(err => console.error(err))

  if (response) {
    const token = response.headers['set-cookie']?.filter(cookie => cookie.startsWith(cookie_key + "="))[0]

    const options = {
      method: 'GET',
      url: address,
      headers: { cookie: token }
    };

    const page = await axios.request(options).catch(console.error);

    if(page) {
      const parsedPage = parse(page.data)
      let node = parsedPage.querySelectorAll("span").filter(span => span.classList.contains('ico_upload'))[0]?.parentNode
      const upload = toNumber(node.textContent)
      node = node.parentNode
      const download = toNumber(node.querySelectorAll('strong')[1].textContent)
      const ratio = parseFloat(node.parentNode.childNodes.filter(child => child.textContent.includes("Ratio"))[0]?.textContent.split(':')[1].trim())
      if(upload && download) {
        return {
          date: new Date(),
          upload: upload,
          download: download,
          ratio: ratio
        }
      }
    }
  }
  return Promise.reject()
}

function toNumber(value: String | void): number | void {
  if(!value)
    return

  const number = value.trim().substring(0, value.trim().length - 2)
  return parseFloat(number)
}