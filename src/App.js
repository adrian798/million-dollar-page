import React from 'react';
import logo from './logo.svg';
import './App.css';



import Arweave from 'arweave/web';
const arweave = Arweave.init();
const APP_NAME_KEY = "appkey";
const APP_NAME = "milliondollarapp";


const Adverts = (props) => {
  return <a title={props.title} href={props.link}><img style={{position: "absolute", zIndex: props.index, left: `${props.x}%`, top: `${props.y}%`, width: `${props.w}%`}} src={props.imageBase64}
  />
  </a>
};

class App extends React.Component{
  constructor(){
    super();
    this.state = {
      openModal: false,
      jwk: null,
      pixels: [],
    }
    this.init();
  }
  init = async() => {
    const txids = await arweave.arql({
      op: "equals",
      expr1: APP_NAME_KEY,
      expr2: APP_NAME,
    });
    let xPromise = await txids.map( async (id) => {
      const transaction = await arweave.transactions.get(id);
      var o = JSON.parse(transaction.get('data', {decode: true, string: true}));
      let balance =  await arweave.wallets.getBalance(o.owner);
      return {...o, balance};
    });
    let x = await Promise.all(xPromise);
    x.sort((a, b) => (a.balance > b.balance) ? 1 : -1);
    this.setState({pixels: x});
  }  
  readWallet = async (file) => {
    let jwk = JSON.parse(await loadWallet(file));
    this.setState({openModal: true, jwk});
  }
  render(){
    return (
      <div className="App">
        <button className="uploadbtn" onClick={() => document.getElementById('upload').click()}>Upload Wallet<input  type="file" id="upload" onChange={ e => this.readWallet(e.target.files[0])} style={{display: "none" }} />
        </button>
        <div className="Board">
        {this.state.pixels.length > 0 ? "" : "Loading..."}
          {
            this.state.pixels.map((o, i)=>{
              o.index = i;
              return (<Adverts key={i} {...o} />)
            })
          }
        </div>
        {this.state.openModal ? <Modal jwk={this.state.jwk} /> : ""}
      </div>
    );
  }
}
class Modal extends React.Component{
  constructor(){
    super();
    this.state = {
      imageBase64: "",
    }
  }

  readImage = (file) => {
    var reader = new FileReader();
    reader.onloadend = () => {
      this.setState({
        imageBase64: reader.result,
      });      
    }
    const  fileType = file['type'];
    const validImageTypes = ['image/gif', 'image/jpeg', 'image/png'];
    if (!validImageTypes.includes(fileType)) {
        alert("Invalid Image!");
        return false;
    }
    reader.readAsDataURL(file);
  }
  submitBtn = async () =>{
    if(!this.state.imageBase64){
      alert("Invalid Image!");
      return false;
    }
    
    if(isNaN(this.state.x) || isNaN(this.state.y) || isNaN(this.state.w)){
      alert("Invalid number!");
      return false;
    }
    if(this.state.w > 51){
      alert("Wow! Your'e taking more than 51% screen width for yourself leave some for others dont be too greedy!");
      return false;
    }
    if(!validURL(this.state.link)){
      alert("Invalid URL!");
      return false;
    }
    
    let data = Object.assign({}, this.state);
    let owner = await arweave.wallets.jwkToAddress(this.props.jwk);
    data.owner = owner;
    let transaction = await arweave.createTransaction({
      data: JSON.stringify(data),
    }, this.props.jwk);
    transaction.addTag(APP_NAME_KEY, APP_NAME);
    await arweave.transactions.sign(transaction, this.props.jwk);
    await arweave.transactions.post(transaction);
    
    alert("Published on Blockchain!");
  }
  render(){
    return (
      <div className="Modal">
          <h2>Upload to Million Dollar HODL Page</h2>
          <p>Enter a Title for your Image</p>
          <input type="text" placeholder="Title" onChange={(e)=>{ this.setState({title: e.target.value})}} />
          <p>Enter a Link for your Image</p>
          <input type="text" placeholder="Link URL" onChange={(e)=>{ this.setState({link: e.target.value})}} />
          <p>Enter a number where your image will be placed from left of the screen(its a % so 5 means 5% from left not 5px)</p>
          <input type="text" placeholder="Page X-Axis %" onChange={(e)=>{ this.setState({x: parseInt(e.target.value)})}} />
          <p>Enter a number where your image will be placed from top of the screen(its a % so 5 means 5% from top not 5px)</p>
          <input type="text" placeholder="Page Y-Axis %" onChange={(e)=>{ this.setState({y: parseInt(e.target.value)})}} />
          <p>Enter a number of what your image width will occupy(its a % so 5 means image will occupy 5% of screen not 5px). Height is adjusted automatically to keep image in ratio</p>
          <input type="text" placeholder="Width %" onChange={(e)=>{ this.setState({w: parseInt(e.target.value)})}} />
          <p></p>
          <button className="imagebtn" onClick={() => document.getElementById('uploadImage').click()}>
            Upload Image
            <input  type="file" id="uploadImage" onChange={ e => this.readImage(e.target.files[0])} style={{display: "none" }} />
          </button>          
          <p></p>
          <button className="uploadbtn imagebtn" style={{position: "relative"}} onClick={()=>{ this.submitBtn() }}>
            Publish
          </button>
      </div>
    )    
  }
}
const loadWallet = (wallet) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => {
      reader.abort()
      reject()
    }
    reader.addEventListener("load", () => {resolve(reader.result)}, false)
    reader.readAsText(wallet)
  })
}

function validURL(str) {
  var pattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
    '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domain name
    '((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
    '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
    '(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
    '(\\#[-a-z\\d_]*)?$','i'); // fragment locator
  return !!pattern.test(str);
}
export default App;
