import NoSSR from 'react-no-ssr'
import Game from '../components/Game'

export default () => (
  <div>
    <NoSSR>
      <Game roomName='game' />
    </NoSSR>

    <style global jsx>{`
      * {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif;
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
)
