> Upload static images into jsreport and add them into reports

##Basics

`Images` is very simple but very handy extension. Business reports very often contain static images like company logos, themes, headers, footers and others. It's possible to reference image from any web based provider like `skydrive` or `dropbox`, but it is not very efficient to download same pictures every time you are rendering a report. That's why jsreport ships with `Images` extension. 

You can upload images through jsreport studio as well as API. When you have uploaded image, you can insert it to the any template. 

You can use following syntax to add base64 image into html template
```html
<img src='{#image Chrysanthemum}'/> 
```

or use a absolute link to the image
```html
<img src='http://jsreport-host/api/image/name/image-name'/>
```


Images can be also combined together with templating engines to get image dynamically

In handlebars you can use
```html
<img src="{#image {{name}}}"/>
```

or in jsrender
```html
<img src="{#image {{:name}}}"/>
```

##API
You can use standard OData API to manage and query image entities. For example you can query all images using:
> `GET` http://jsreport-host/odata/images

To upload an image you can use simple http POST because image content is just a byte array. You can find image entity structure in OData metadata

>`GET` http://jsreport-host/odata/$metadata
