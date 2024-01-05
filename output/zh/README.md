
This is the [website](https://pegasus.apache.org/) codebase of the Apache [Pegasus](https://github.com/apache/incubator-pegasus) project.

It is a static website based on Jekyll, and almost all the documents are written in Markdown.

If you found any mistake on the website, or you've developed a new feature for the Pegasus project, or you want to improve the UI/UE of the website, you are encouraged to update the website.

# How to contribute

## How to preview the website

Install Jekyll at first https://jekyllrb.com/docs/

```bash
$ git clone git@github.com:apache/incubator-pegasus-website.git
$ cd incubator-pegasus-website
$ bundle exec jekyll serve
...
 Auto-regeneration: enabled for '.../incubator-pegasus-website'
    Server address: http://127.0.0.1:4000
  Server running... press ctrl-c to stop.
```

Then open your browser and visit http://127.0.0.1:4000

## Submit your changes

1. Update the website codebase, and preview it locally to check it act as expected.

> If you want to update or draw a new diagram, you can use [draw.io](https://app.diagrams.net/) and open [assets/drawio/apache_pegasus_website.drawio](./assets/drawio/apache_pegasus_website.drawio) to draw it, and save it as a `.png` file, then put it into the `assets/images` directory.
> Remember to submit the changed `.drawio` file together with the `.png` file.

2. Submit the patch as a [pull request](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/about-pull-requests)

3. Wait the project committers to review and merge your patch.

## View on the website

Open your browser and visit https://pegasus.apache.org/, you will see the result of your patch.

Enjoy it!