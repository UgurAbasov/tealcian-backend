export default function simpleHash(inputString: string[]) {
    let hash = 0;
    let resultString = ''
    for(let i = 0; i < inputString.length; i++){
        const inexOfMail = inputString[i].indexOf('@')
        const result = inputString[i].substring(0, inexOfMail)
        resultString+=result
    }
    for (let i = 0; i < resultString.length; i++) {
      hash += resultString.charCodeAt(i);
    }

    return hash
  }