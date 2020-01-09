import React from 'react';
import { Menu, Icon } from 'antd';
import { HashRouter as Router, Switch, Route, Link } from 'react-router-dom';

const App = () => (
  <Router>
    <p>Hello World</p>
    <p>Sample child navigation</p>
    <Menu mode="horizontal">
      <Menu.Item>
        <Link to="/home/">Home</Link>
      </Menu.Item>
      <Menu.Item>
        <Link to="/home/about">Home/About</Link>
      </Menu.Item>
      <Menu.Item>
        <Link to="/home/users">Home/Users</Link>
      </Menu.Item>
      <Menu.Item>
        <Link to="/demo">Demo</Link>
      </Menu.Item>
    </Menu>
    <Switch>
      <Route path="/home/about">
        <About />
      </Route>
      <Route path="/home/users">
        <Users />
      </Route>
      <Route path="/demo">
        <Home />
      </Route>
    </Switch>
  </Router>
);

function Home() {
  return <h2>Home</h2>;
}

function About() {
  return <h2>About</h2>;
}

function Users() {
  return <h2>Users</h2>;
}

export default App;
