const app = require('express')();

app.use(require('cors')());
app.listen(3000, () => console.log('CDN service running in port 3000'));

app.use(express.static('files'));
app.use(express.static('public'));