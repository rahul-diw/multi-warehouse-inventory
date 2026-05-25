# Machine learning in Javascript

## Install

```
npm i mult --save
```

## Usage

### Import

#### ES6
```ecma script level 6
import { Matrix, LinearRegression, append, dot, determinant, inverse, LUPDecompose, prepend, solve, transpose } from 'jonatanai'
```
#### CommonJS
```javascript
const { Matrix, LinearRegression, append, dot, determinant, inverse, LUPDecompose, prepend, solve, transpose } = require('jonatanai')

```

### Matrix from 2d array

```
let a = [[2, 2], [2, 2]]
new Matrix([[2, 2], [2, 2]])
Matrix.from([[2, 2], [2, 2]])
```

### Matrix from 2d array

```
let a = [[2, 2], [2, 2]]
new Matrix(a)
Matrix.from(a)
a[0][0] = 3 // Will change the matrices. If this is not desired do new Matrix(a, true)
```

### Empty matrix

```
Matrix.empty(2) // = [[undefined, undefined], [undefined, undefined]]
Matrix.empty(2, 3) // = [[undefined, undefined], [undefined, undefined], [undefined, undefined]]
```

### Matrix of ones

```
Matrix.ones(2) // = [[1, 1], [1, 1]]
Matrix.ones(2, 3) // = [[0, 0], [0, 0], [0, 0]]
```


### Zero matrix

```
Matrix.zeros(2) // = [[0, 0], [0, 0]]
Matrix.zeros(2, 3) // = [[0, 0], [0, 0], [0, 0]]
```

### Identity matrix

```
Matrix.identity(3) // = [[1, 0, 0], [0, 1, 0], [0, 0, 1]]
```

### Matrix multiplication
```
let a = [[2, 2], [2, 2]]
let b = [[2, 2], [2, 2]]
matmul(a, b) // = [[8, 8], [8, 8]]

const m1 = new Matrix(a)
const m2 = new Matrix(b)

m1.matmul(m2) // = [[8, 8], [8, 8]]

```
### Transpose

```
const a = [[1,2],[3,4],[5,6]]

transpose(a) // [[1,3,5],[2,4,6]]
Matrix.from(a).transpose() // [[1,3,5],[2,4,6]]
Matrix.from(a).T // [[1,3,5],[2,4,6]]
```

### Matrix determinant

```
determinant([[1, 2], [3, 4]]) // -2
determinant([[1, 3, 5, 9], [1, 3, 1, 7], [4, 3, 9, 7], [5, 2, 0, 9]]) // -376
```

### Matrix inverse

```
inverse([[1, 2], [3, 4]]) // [[-2, 1], [3 / 2, -1 / 2]]

inverse([[1, 3, 5, 9], [1, 3, 1, 7], [4, 3, 9, 7], [5, 2, 0, 9]])
// = [
//  [-13 / 47, 2 / 47, 7 / 47, 6 / 47],
//  [-5 / 8, 7 / 8, 1 / 4, -1 / 4],
//  [39 / 376, -56 / 376, 13 / 188, -9 / 188],
//  [55 / 188, -41 / 188, -13 / 94, 9 / 94]
//]
```

### Prepend

```
const v = [0,0,0]
const a = [
 [1,2,3],
 [4,5,6],
 [7,8,9]
]
prepend(a,v,0)
// const a = [
//  [0,0,0],
//  [1,2,3],
//  [4,5,6],
//  [7,8,9]
// ]
prepend(a,v,1)
// const a = [
//  [0,1,2,3],
//  [0,4,5,6],
//  [0,7,8,9]
// ]
```

### Append

```
const v = [0,0,0]
const a = [
 [1,2,3],
 [4,5,6],
 [7,8,9]
]
append(a,v,0)
// const a = [
//  [1,2,3],
//  [4,5,6],
//  [7,8,9],
//  [0,0,0]
// ]
append(a,v,1)
// const a = [
//  [1,2,3,0],
//  [4,5,6,0],
//  [7,8,9,0]
// ]
```

### Add
```
    const m1 = Matrix.from([[1, 1], [1, 1]])
    const m2 = Matrix.from([[1, 1], [1, 1]])
    m1.add(m2) // [[2, 2], [2, 2]]
```

### Subtract
```
    const m1 = Matrix.from([[2, 2], [2, 2]])
    const m2 = Matrix.from([[1, 1], [1, 1]])
    m1.subtract(m2) // [[1, 1], [1, 1]]
```


### Norm
```
    let m = Matrix.from([[1, 1], [1, 1]])
    m.norm() // 2

    m = Matrix.from([[2, 2], [2, 2]])
    m.norm() // 4

    m = Matrix.from([[3, 3], [3, 3]])
    m.norm() // 6
```


### Solve matrix equations

```
let A = [[2, 3, -2], [1, -1, -3], [1, 5, 2]]
let B = [7, 5, 10]
solve(A, B) // [99, -35, 43]
```

### Linear regression

```
const clf = new LinearRegression()
const X = [
  [0.18, 0.89],
  [1.0, 0.26],
  [0.92, 0.11],
  [0.07, 0.37],
  [0.85, 0.16],
  [0.99, 0.41],
  [0.87, 0.47],
]
const y = [
  [109.85],
  [155.72],
  [137.66],
  [76.17],
  [139.75],
  [162.6],
  [151.77],
]
const X_test = [
  [0.49, 0.18],
  [0.57, 0.83],
  [0.56, 0.64],
  [0.76, 0.18],
]
const y_test = [
  [105.21455835],
  [142.67095131],
  [132.93605469],
  [129.70175405],
]
clf.train(lr_X, lr_y)
clf.predict(lr_X_test) // === y_test
```

### Copy

Return a new copy of the matrix shorthand for `new Matrix(m.toArry())`

```
const a = [[1,2],[3,4],[5,6]]

Matrix.from(a).copy() // [[1,2],[3,4],[5,6]]
```

### Size

```
m = Matrix.ones(4, 3)
m.size() // = [4,3]
```

### toString

```
m = Matrix.fill(3, 3, 4)
m.toString()
# [4,4,4]
# [4,3,3]
# [4,4,4]
```
## License

[CC BY-NC-ND 4.0](./LICENSE)
