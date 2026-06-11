import './app.css';
import App from './App.svelte';
import { mount } from 'svelte';

const target = document.getElementById('app');

if (target) {
  // 2. Mount your app into the target container
  mount(App, {
    target: target,
  });
}
