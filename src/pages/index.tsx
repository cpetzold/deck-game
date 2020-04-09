import * as React from "react";

import dynamic from "next/dynamic";

const Game = dynamic(() => import("../components/Game"), { ssr: false });

export default () => (
  <div>
    <Game roomName="game" debug />

    <style global jsx>{`
      * {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto",
          "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans",
          "Helvetica Neue", sans-serif;
        box-sizing: border-box;
        user-select: none;
      }

      html {
        background: #eee;
      }

      body {
        margin: 0;
      }
    `}</style>
  </div>
);
