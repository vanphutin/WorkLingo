export function MockTaskPrompt({prompt}:{readonly prompt:string}) {
  const lines=prompt.split('\n');const data=lines.filter(line=>line.includes('|')).map(line=>line.split('|').map(cell=>cell.trim()));
  return <div lang="en">{lines.filter(line=>line.trim()&&!line.includes('|')).map((line,index)=><p key={index}>{line}</p>)}{data.length?<div className="mock-data-table"><table><thead><tr>{data[0]!.map((cell,index)=><th scope="col" key={index}>{cell}</th>)}</tr></thead><tbody>{data.slice(1).map((row,index)=><tr key={index}>{row.map((cell,column)=><td key={column}>{cell}</td>)}</tr>)}</tbody></table></div>:null}</div>;
}
