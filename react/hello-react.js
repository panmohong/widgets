class HelloReact extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      text: 'Hello React',
    };
  }

  render() {
    return <div>{this.state.text}</div>;
  }
}

ReactDOM.render(React.createElement(HelloReact), document.querySelector('#react'));
