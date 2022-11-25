import { useState, useEffect, useCallback } from 'react'
import { publicRequest } from './backend'
import dayjs from 'dayjs'
import './App.css'

//default pml data
const defaultPmlValue = 
`{order number="123"}
  {pizza number="1"}
    {size}large{\\size}
    {crust}hand-tossed{\\crust}
    {type}custom{\\type}
    {toppings area="0"}
      {item}pepperoni{\\item}
      {item}extra cheese{\\item}
    {\\toppings}
    {toppings area="1"}
      {item}sausage{\\item}
    {\\toppings}
    {toppings area="2"}
      {item}mushrooms{\\item}
    {\\toppings}
  {\\pizza}
  {pizza number="2"}
    {size}medium{\\size}
    {crust}deep dish{\\crust}
    {type}pepperoni feast{\\type}
  {\\pizza}
{\\order}`;

//values for use for validations
const pizzaDetails = {
  sizes: ['small', 'medium', 'large'],
  crusts: ['thin', 'thick', 'hand-tossed', 'deep dish'],
  types: ['Hawaiian', 'Chicken Fajita', 'Pepperoni Feast', 'Custom'],
  toppingAreas: {
    0: 'Whole',
    1: 'First-Half',
    2: 'Second-Half'
  },
};

function App() {
  const [pml, setPml] = useState(defaultPmlValue)
  const [htmlString, setHtmlString] = useState("")
  const [orderData, setOrderData] = useState([])

  //load order data at first run
  useEffect(() => {
    getOrder()
  },[]);

  //get data from db
  const getOrder = () => {
    publicRequest.get("/order")
      .then((res) => {
        setOrderData(res.data); 
      })
      .catch((err) => {
        console.log("err");
      });
  }

  //create new order
  const saveOrder = (data) => {
    publicRequest.post("/order", data)
      .then((res) => {
        setOrderData(prevArray => [...prevArray, res.data]) 
      })
      .catch((err) => {
        console.log("err");
      });
  }

  //delete data from order list
  const deleteOrder = (id) => {
    publicRequest.delete("/order/"+id)
      .then((res) => {
        setOrderData(orderData.filter(item => item._id !== id)) 
      })
      .catch((err) => {
        console.log("err");
      });
  }

  //display to textarea
  const UseOrder = (id) => {
    publicRequest.get("/order/"+id)
      .then((res) => {
        setPml(res.data.details)
      })
      .catch((err) => {
        console.log("err");
      });
  }

  // update pml on change
  const onChangePml = (e) => {
    setPml(e.target.value)
  }

  //pml format to htmltags
  const convertToHtmlTag = (order) => {
    order = order.replace(/{/g, '<').replace(/\\/g, '/').replace(/}/g, '>');
    const parser = new DOMParser();
    return parser.parseFromString(order, 'text/xml');
  }

  //validate
  const validate = (doc) => {
    const orderTags = doc.getElementsByTagName('order');
    if (orderTags.length === 0) return "No orders";
    const newOrder = orderTags[0];

    if (!newOrder.hasAttribute('number') || newOrder.getAttribute('number').trim() === '') return "Order has no number attribute";

    const pizzas = newOrder.getElementsByTagName('pizza');

    for (let i = 0; i < pizzas.length; i++) {
      const pizza = pizzas[i];
      // check if pizza numbers are in order and starts at 1.
      if (parseInt(pizza.getAttribute('number')) !== i + 1) return "Incorrect order of pizzas";

      // check if size is small, medium, or large.
      const size = pizza.getElementsByTagName('size');
      if (size.length === 0) {
        return "Indicate pizza size";
      } else if (size.length > 1) {
        return "Only one size per pizza";
      }
      for (let j = 0; j < pizzaDetails.sizes.length; j++) {
        if (pizzaDetails.sizes[j].toLowerCase() === size[0].textContent.toLowerCase()) break;
        if (j === pizzaDetails.sizes.length - 1) return "Pizza size must be small, medium, or large";
      }

      // check if crust is thin, thick, hand-tossed, deep dish.
      const crust = pizza.getElementsByTagName('crust');
      if (crust.length === 0) {
        return "Indicate pizza crust";
      } else if (crust.length > 1) {
        return "Only one crust type per pizza.";
      }

      for (let j = 0; j < pizzaDetails.crusts.length; j++) {
        if (pizzaDetails.crusts[j].toLowerCase() === crust[0].textContent.toLowerCase()) break;
        if (j === pizzaDetails.crusts.length - 1) return "Pizza crust must be thin, thick, hand-tossed, or deep dish";
      }

      // check if type is Hawaiian, Chicken Fajita, Pepperoni Feast, or custom.
      const pizzaType = pizza.getElementsByTagName('type');

      if (pizzaType.length === 0) {
        return "Indicate pizza type";
      } else if (pizzaType.length > 1) {
        return "Only one type per pizza";
      }
      
      for (let j = 0; j < pizzaDetails.types.length; j++) {
        if (pizzaDetails.types[j].toLowerCase() === pizzaType[0].textContent.toLowerCase()) break;
        if (j === pizzaDetails.types.length - 1) return "Pizza type must be Hawaiian, Chicken Fajita, Pepperoni Feast, or custom.";
      }

      // check toppings.
      const toppingAreas = pizza.getElementsByTagName('toppings');
      if (pizzaType[0].textContent.toLowerCase() !== 'custom' && toppingAreas.length > 0) {
        return "Selected pizza type cannot have custom toppings";
      } else if (toppingAreas.length > 3) {
        return "Up to 12 topping areas allowed";
      }

      for (let j = 0; j < toppingAreas.length; j++) {
        const toppingArea = toppingAreas[j];
        // check if topping area is valid
        if (!(parseInt(toppingArea.getAttribute('area')) in pizzaDetails.toppingAreas)) {
          return "Topping area must be 0 (whole pizza), 1 (first-half), or 2 (second-half)";
        }
        const toppings = toppingArea.getElementsByTagName('item');
        if (toppings.length > 12) {
          return "Up to 12 toppings per area allowed";
        }
      }
    }
    return "Valid"
  }

  const processPml = () => {
    const toHtmlTags = convertToHtmlTag(pml);
     //check if format is valid
    const checkValidation = validate(toHtmlTags)
    if (checkValidation !== 'Valid'){
      setHtmlString(`<span class="text-danger"">${checkValidation}</span>`)
      return
    }

    //update to htmltags
    const order = toHtmlTags.getElementsByTagName('order')[0];
    let parsedStr = `<ul class="order"><li>Order ${order.getAttribute('number')}:`;
    let pizzas = order.getElementsByTagName('pizza');
    if (pizzas.length) {
      parsedStr += `<ul class="pizzas">`;
      for (let i = 0; i < pizzas.length; i++) {
        const pizza = pizzas[i];
        const size = pizza.getElementsByTagName('size')[0].textContent;
        const crust = pizza.getElementsByTagName('crust')[0].textContent;
        const pizzaType = pizza.getElementsByTagName('type')[0].textContent;
        parsedStr += `<li>Pizza ${pizza.getAttribute('number')} - ${size}, ${crust}, ${pizzaType}`;
        if (pizzaType.toLowerCase() === 'custom') {
          const toppingAreas = pizza.getElementsByTagName('toppings');
          if (toppingAreas.length) {
            parsedStr += `<ul class="topping-areas">`;
            for (let j = 0; j < toppingAreas.length; j++) {
              const toppingArea = toppingAreas[j];
              parsedStr += `<li>Toppings ${pizzaDetails.toppingAreas[toppingArea.getAttribute('area')]}:`;
              const toppings = toppingArea.getElementsByTagName('item');
              if (toppings.length) {
                parsedStr += `<ul class="toppings">`;
                for (let k = 0; k < toppings.length; k++) {
                  parsedStr += `<li>${toppings[k].textContent}</li>`;
                }
                parsedStr += `</ul>`;
              }
              parsedStr += `</li>`;
            }
            parsedStr += `</ul>`;
          }
        }
        parsedStr += `</li>`;
      }
      parsedStr += `</ul>`;
    }
    parsedStr += `</li></ul>`;

    //get string data
    setHtmlString(parsedStr)
    //save to db
    saveToDB(order.getAttribute('number'), pml)
  }

  const clear = () => {
    setHtmlString("")
  }

  //save to db
  const saveToDB = (orderNo, order) => {
    const data = {orderNo: Number(orderNo), details: order}
    saveOrder(data)
  }

  return (
    <div className="App">
      <div className="row">
        <div className="col-md-12">
          <div className="form-group mb-3">
            <h5>PIZZA TEST</h5>
            <div className="display">
              {orderData.length > 0 && 
                <table className="table">
                  <thead>
                    <tr>
                      <th scope="col">Order #</th>
                      <th scope="col">Created At</th>
                      <th scope="col">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderData.map((data) =>
                      <tr key={data._id}>
                        <th>{data.orderNo}</th>
                        <td>{dayjs(data.createdAt).format("MMM D, YYYY h:mm A")}</td>
                        <td className="d-flex gap-2">
                          <button 
                            className="btn btn-sm btn-primary" 
                            onClick={() => UseOrder(data._id)}
                          >
                            Use Order
                          </button>
                          <button 
                            className="btn btn-sm btn-danger" 
                            onClick={() => deleteOrder(data._id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              }
              <textarea value={pml} className="form-control" onChange={onChangePml} rows="15"/>
            </div>
          </div>
          <button className="btn btn-dark" type="button" onClick={processPml}>Process</button>
        </div>
      </div>
      <div className="row">
        <div className="col-md-12 mt-3">
          { htmlString !== ""
            ? <div dangerouslySetInnerHTML={{__html: htmlString}}/> //get string data to html
            : <div>Nothing to display yet</div>
          }
          { htmlString !== "" && <button className="btn btn-danger mt-3" type="button" onClick={clear}>Clear</button>}
        </div>
      </div>
    </div>
  )
}

export default App
