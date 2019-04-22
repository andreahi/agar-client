


function zeros(dimensions) {
    var array = [];

    for (var i = 0; i < dimensions[0]; ++i) {
        array.push(dimensions.length == 1 ? 0 : zeros(dimensions.slice(1)));
    }

    return array;
}

function indexOfMax(arr) {
    if (arr.length === 0) {
        return -1;
    }

    var max = arr[0];
    var maxIndex = 0;

    for (var i = 1; i < arr.length; i++) {
        if (arr[i] > max) {
            maxIndex = i;
            max = arr[i];
        }
    }

    return maxIndex;
}


async function f() {
    var socket = require('socket.io-client')('http://localhost:3000?type=player');

    socket.emit("disconnect");
    socket.emit("respawn");

    screen_size = 1000;
    screen_scaling = 100;
    socket.emit("gotit", {
            "id": "NWt_X5T25f7LtnZzAAAI",
            "x": 982.9736659610103,
            "y": 3939.9736659610103,
            "w": 10,
            "h": 10,
            "cells": [{"mass": 10, "x": 982.9736659610103, "y": 3939.9736659610103, "radius": 22.973665961010276}],
            "massTotal": 10,
            "hue": 101,
            "type": "player",
            "lastHeartbeat": new Date().getTime(),
            "target": {"x": 0, "y": 0},
            "name": "xwerfg",
            "screenWidth": screen_size,
            "screenHeight": screen_size
        }
    );



    counter = 0;
    action_counter = 0

    var redis = require("redis"),
        redisClient = redis.createClient();

    const {promisify} = require('util');
    const getAsync = promisify(redisClient.get).bind(redisClient);


    let data = {"actions": [], "screens": [], "scores": [], "individual_values": [] };
    //stored_data = await getAsync("data");
    //data = JSON.parse(stored_data);
    socket.on("serverTellPlayerMove", function (visibleCells, visibleFood, visibleMass, visibleVirus) {
        //console.log(visibleCells[0].massTotal)
        screen = zeros([2 * screen_size / screen_scaling, 2 * screen_size / screen_scaling]);

        myX = visibleCells[0].x;
        myY = visibleCells[0].y;
        for (i = 0; i < visibleFood.length; i++) {
            food = visibleFood[i]
            var relative_x = Math.round((screen_size + food.x - myX) / screen_scaling);
            var relative_y = Math.round((screen_size + food.y - myY) / screen_scaling);
            screen[relative_x][relative_y] = 1;
        }

        let score = visibleCells[0].massTotal/20;
        if(visibleCells[0].x > 4500 ||  visibleCells[0].y > 4500 || visibleCells[0].x < 500 || visibleCells[0].y < 500)
            score = score/2;
        individual_values = [counter/100, score, visibleCells[0].x / 5000, visibleCells[0].y / 5000];

        redisClient.set("state", JSON.stringify({"food":screen, "individual_values": individual_values}))



        if (action_counter !== counter) {
            console.log("skipped action restarting");
            socket.disconnect();
            socket.close();

            f();
            return;
        }

        counter += 1;
        redisClient.watch("action", function(err, response){
            if(err) throw err;

            redisClient.get("action", function( err, reply){
                if(reply == null)
                    return;
                redisClient.del('action');

                action_counter += 1;


                reply = JSON.parse(reply);
                let bestAction = indexOfMax(reply);

                prev_x = 0;
                prev_y = 0;
                if(bestAction === 0)
                    prev_x = -1000;
                else if(bestAction === 1)
                    prev_x = 1000;
                else if(bestAction === 2)
                    prev_y = -1000;
                else if(bestAction === 3)
                    prev_y = 1000;


                let action = {x: prev_x, y: prev_y};
                socket.emit("0", action);
                //console.log(action)

                let actionPerformed = zeros([4]);
                actionPerformed[bestAction] = 1;
                data.actions.push(actionPerformed);
                data.screens.push(screen);
                data.scores.push(score);
                data.individual_values.push(individual_values);

            })

        });

        if (counter > 100) {
            console.log(20*score)

            redisClient.set("data", JSON.stringify(data));
            socket.disconnect();
            socket.close();

            f();
            return;
        }

        //console.log(counter)

        //for(i = 0; i < screen.length; i++)
        //    console.log(screen[i].toString())
    });


}

f()